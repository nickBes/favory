use std::sync::{atomic::AtomicUsize, Arc, Mutex};

use anyhow::Context;
use log::warn;
use scraper::Html;
use tokio::task::JoinHandle;

use crate::{LaptopsProcessor, LaptopsScraper, ScrapedLaptop, ScraperClient};

#[async_trait::async_trait]
pub trait PaginatedLaptopsScraper: Clone + Send + 'static {
    fn config(&mut self) -> PaginatedLaptopsScraperConfig;
    fn find_pages_amount(&mut self, first_page: &Html) -> anyhow::Result<usize>;
    fn extract_laptop_urls(&mut self, page: Html) -> anyhow::Result<Vec<String>>;
    fn scrape_laptop_page(&mut self, page: Html) -> anyhow::Result<ScrapedLaptop>;
    async fn load_page(
        &mut self,
        page_number: usize,
        client: &ScraperClient,
    ) -> anyhow::Result<Html>;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PaginatedLaptopsScraperConfig {
    pub first_page_number: usize,
    pub max_page_tasks: usize,
    pub tasks_per_page: usize,
}

#[async_trait::async_trait]
impl<T: PaginatedLaptopsScraper> LaptopsScraper for T {
    async fn scrape_laptops(
        &mut self,
        client: ScraperClient,
        laptops_processor: impl LaptopsProcessor,
    ) -> anyhow::Result<()> {
        let config = self.config();
        let ctx = PaginatedLaptopsScraperCtx {
            scraper: self.clone(),
            laptops_processor,
            client,
            config: Arc::new(config),
        };
        // the extra scope here is because the type `Html` of the variable `first_page` is not
        // `Send`, so it can't be used across awaits.
        let (pages_amount, first_page_laptop_urls) = {
            // load the first page so that we can find the total amount of pages
            let first_page = self
                .load_page(config.first_page_number, &ctx.client)
                .await
                .context("failed to load page")?;

            let pages_amount = self
                .find_pages_amount(&first_page)
                .context("failed to find pages amount")?;

            if pages_amount == 0 {
                return Ok(());
            }

            // scrape the first page already, to avoid loading it twice.
            let first_page_laptop_urls = self
                .extract_laptop_urls(first_page)
                .context("failed to extract laptop urls from page")?;

            (pages_amount, first_page_laptop_urls)
        };

        let tasks_amount = std::cmp::min(pages_amount, config.max_page_tasks);

        // +1 here because the first page was already loaded and scraped.
        let cur_page_number_counter = Arc::new(AtomicUsize::new(config.first_page_number + 1));

        let last_page_number = config.first_page_number + pages_amount - 1;

        // spawn the tasks
        let mut tasks = Vec::new();
        for _ in 0..tasks_amount {
            let ctx = ctx.clone();
            let cur_page_number_counter = cur_page_number_counter.clone();
            let task = tokio::spawn(async move {
                scrape_page(ctx, cur_page_number_counter, last_page_number).await
            });
            tasks.push(task);
        }

        // also spawn tasks to scrape the laptop urls we got from first page
        start_scraping_laptop_urls(first_page_laptop_urls, ctx.clone(), &mut tasks);

        for task in tasks {
            let task_result = task.await.unwrap();
            // make sure to propegate any errors from the tasks
            task_result?;
        }

        Ok(())
    }
}

async fn scrape_page<T: PaginatedLaptopsScraper, P: LaptopsProcessor>(
    mut ctx: PaginatedLaptopsScraperCtx<T, P>,
    cur_page_number_counter: Arc<AtomicUsize>,
    last_page_number: usize,
) -> anyhow::Result<()> {
    let mut tasks = Vec::new();
    loop {
        let next_page_number =
            cur_page_number_counter.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if next_page_number > last_page_number {
            break;
        }

        let page = ctx
            .scraper
            .load_page(next_page_number, &ctx.client)
            .await
            .context("failed to load page")?;
        let laptop_urls = ctx
            .scraper
            .extract_laptop_urls(page)
            .context("failed to extract laptop urls")?;
        start_scraping_laptop_urls(laptop_urls, ctx.clone(), &mut tasks);
    }

    // wait for all the tasks to finish
    for task in tasks {
        let task_result = task.await.unwrap();
        // make sure to propegate any errors from the tasks
        task_result?
    }
    Ok(())
}

fn start_scraping_laptop_urls<T: PaginatedLaptopsScraper, P: LaptopsProcessor>(
    laptop_urls: Vec<String>,
    ctx: PaginatedLaptopsScraperCtx<T, P>,
    tasks: &mut Vec<JoinHandle<anyhow::Result<()>>>,
) {
    if ctx.config.tasks_per_page >= laptop_urls.len() {
        for laptop_url in laptop_urls {
            let mut ctx = ctx.clone();
            let task = tokio::spawn(async move {
                let page = ctx.client.get(&laptop_url).await.context("http error")?;
                match ctx.scraper.scrape_laptop_page(page) {
                    Ok(laptop) => ctx
                        .laptops_processor
                        .process_laptop(laptop)
                        .context("failed to process laptop")?,
                    Err(err) => {
                        warn!(
                            "error while scraping laptop page, page url: {}, error: {:?}",
                            laptop_url, err
                        );
                    }
                };
                Ok(())
            });
            tasks.push(task);
        }
    } else {
        // we have more laptops than task, need to split the work
        let laptop_urls_left = Arc::new(Mutex::new(laptop_urls));

        // spawn the tasks
        for _ in 0..ctx.config.tasks_per_page {
            let laptop_urls_left = laptop_urls_left.clone();
            let mut ctx = ctx.clone();
            tasks.push(tokio::spawn(async move {
                loop {
                    let next_laptop_url = {
                        let mut laptop_urls_left = laptop_urls_left.lock().unwrap();
                        laptop_urls_left.pop()
                    };
                    match next_laptop_url {
                        Some(next_laptop_url) => {
                            let page = ctx.client.get(&next_laptop_url).await.context("http error")?;
                            match ctx.scraper.scrape_laptop_page(page) {
                                Ok(laptop) => ctx.laptops_processor.process_laptop(laptop).context("failed to process laptop")?,
                                Err(err) => {
                                    warn!(
                                        "error while scraping laptop page, page url: {}, error: {:?}",
                                        next_laptop_url, err
                                    );
                                }
                            };
                        }
                        None => break,
                    }
                }
                Ok(())
            }))
        }
    }
}

#[derive(Debug, Clone)]
struct PaginatedLaptopsScraperCtx<T: PaginatedLaptopsScraper, P: LaptopsProcessor> {
    scraper: T,
    laptops_processor: P,
    client: ScraperClient,
    config: Arc<PaginatedLaptopsScraperConfig>,
}
