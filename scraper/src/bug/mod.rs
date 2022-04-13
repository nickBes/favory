use scraper::{Html, Selector};

use crate::{
    error::*,
    paginated_scraper::{PaginatedLaptopsScraper, PaginatedLaptopsScraperConfig},
    LaptopsProcessor, LaptopsScraper, ScrapedLaptop, ScraperClient,
};

#[derive(Debug, Clone)]
pub struct BugLaptopsScraper;

#[async_trait::async_trait]
impl PaginatedLaptopsScraper for BugLaptopsScraper {
    fn config(&mut self) -> PaginatedLaptopsScraperConfig {
        PaginatedLaptopsScraperConfig {
            first_page_number: 1,
            max_page_tasks: 10,
            tasks_per_page: 12,
        }
    }
    fn find_pages_amount(&mut self, first_page: &Html) -> anyhow::Result<usize> {
        lazy_static::lazy_static! {
            static ref PAGE_LINKS_SELECTOR: Selector = Selector::parse(".pagination > .num").unwrap();
        }
        let page_links_amount = first_page.select(&PAGE_LINKS_SELECTOR).count();
        if page_links_amount == 0{
            return Err(anyhow::Error::msg("couldn't find any page links"))
        }
        Ok(page_links_amount)
    }

    fn extract_laptop_urls(&mut self, page: Html) -> anyhow::Result<Vec<String>> {
        lazy_static::lazy_static! {
            static ref LAPTOP_LINK_SELECTOR: Selector = Selector::parse("h4 > .tpurl").unwrap();
        }
        Ok(page
            .select(&LAPTOP_LINK_SELECTOR)
            .filter_map(|laptop_link| laptop_link.value().attr("href"))
            .map(|relative_url| format!("https://www.bug.co.il{}", relative_url))
            .collect())
    }

    fn scrape_laptop_page(&mut self, page: Html) -> anyhow::Result<ScrapedLaptop> {
        lazy_static::lazy_static! {
            static ref LAPTOP_NAME_SELECTOR: Selector = Selector::parse("#product-page-prodict-title > div:nth-child(2)").unwrap();
        }
        Ok(ScrapedLaptop {
            name: page
                .select(&LAPTOP_NAME_SELECTOR)
                .next()
                .ok_or(anyhow::Error::msg("can't find laptop name element"))?
                .inner_html(),
        })
    }

    async fn load_page(&mut self, page_number: usize, client: &ScraperClient) -> Result<Html> {
        let url = format!("https://www.bug.co.il/laptops/?page={}", page_number);
        Ok(client.get(url).await?)
    }
}
