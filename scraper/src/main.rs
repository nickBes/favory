mod bug;
mod paginated_scraper;

use std::sync::{atomic::AtomicUsize, Arc};

use anyhow::Context;
use bug::BugLaptopsScraper;
use reqwest::{header::USER_AGENT, IntoUrl};
use scraper::Html;

#[async_trait::async_trait]
pub trait LaptopsScraper {
    /// Scrapes laptops and forwards them to the laptops processor.
    async fn scrape_laptops(
        &mut self,
        client: ScraperClient,
        laptops_processor: impl LaptopsProcessor,
    ) -> anyhow::Result<()>;
}

pub trait LaptopsProcessor: Clone + Send + 'static {
    /// Process a new laptop.
    fn process_laptop(&mut self, laptop_info: ScrapedLaptop) -> anyhow::Result<()>;
}

/// Information about a scraped laptop that each scraper should extract.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ScrapedLaptop {
    name: String,
}

/// A laptops processor which just prints laptops.
#[derive(Debug, Clone)]
pub struct LaptopsPrinter {
    laptops_amount: Arc<AtomicUsize>,
}

impl LaptopsProcessor for LaptopsPrinter {
    fn process_laptop(&mut self, laptop_info: ScrapedLaptop) -> anyhow::Result<()> {
        let amount = self
            .laptops_amount
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        println!(
            "got laptop: {:?}, laptops_amount: {}",
            laptop_info,
            amount + 1
        );
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ScraperClient {
    client: reqwest::Client,
}
impl ScraperClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
    pub async fn get(&self, url: impl IntoUrl) -> anyhow::Result<Html> {
        const FAKE_CHROME_USER_AGENT:&str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.81 Safari/537.36";
        let response_bytes = self
            .client
            .get(url)
            .header(USER_AGENT, FAKE_CHROME_USER_AGENT)
            .send()
            .await
            .context("failed to send http request")?
            .bytes()
            .await
            .context("failed to receive http response")?;
        Ok(Html::parse_document(&String::from_utf8_lossy(
            &response_bytes,
        )))
    }
}

#[tokio::main]
async fn main() {
    BugLaptopsScraper
        .scrape_laptops(
            ScraperClient::new(),
            LaptopsPrinter {
                laptops_amount: Arc::new(AtomicUsize::new(0)),
            },
        )
        .await
        .unwrap();
}
