use std::{collections::HashMap, num::ParseFloatError};

use anyhow::Context;
use itertools::Itertools;
use scraper::{ElementRef, Html, Selector};
use thiserror::Error;

use crate::{
    paginated_scraper::{PaginatedLaptopsScraper, PaginatedLaptopsScraperConfig},
    HardDrive, HardDriveKind, Memory, ParseMemoryError, ScrapedLaptop, ScraperClient, Weight,
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
        if page_links_amount == 0 {
            return Err(anyhow::Error::msg("couldn't find any page links"));
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
            static ref INFO_TABLE_FIRST_HALF_SELECTOR: Selector =
                Selector::parse("#product-properties-container > div:nth-child(1)").unwrap();
            static ref INFO_TABLE_SECOND_HALF_SELECTOR: Selector =
                Selector::parse("#product-properties-container > div:nth-child(3)").unwrap();
            static ref MANUFACTURER_SELECTOR: Selector = Selector::parse("#product-page-prodict-title > div.p-manufacturer > a").unwrap();
        }

        const MODEL_INFO_TABLE_KEY: &str = "דגם";
        const CPU_INFO_TABLE_KEY: &str = "מעבד";
        const GPU_INFO_TABLE_KEY: &str = "מאיץ גרפי";
        const MEMORY_INFO_TABLE_KEY: &str = "זכרון RAM";
        const WEIGHT_INFO_TABLE_KEY: &str = "משקל";
        const HARD_DRIVE_INFO_TABLE_KEY: &str = "כונן קשיח";
        const SCREEN_SIZE_INFO_TABLE_KEY: &str = "מסך";

        // parse the info table
        let mut info_table = HashMap::new();
        let info_table_first_half = page
            .select(&INFO_TABLE_FIRST_HALF_SELECTOR)
            .next()
            .ok_or(anyhow::Error::msg("can't find info table's first half"))?;
        parse_info_table(info_table_first_half, &mut info_table);

        let info_table_second_half = page
            .select(&INFO_TABLE_SECOND_HALF_SELECTOR)
            .next()
            .ok_or(anyhow::Error::msg("can't find info table's second half"))?;
        parse_info_table(info_table_second_half, &mut info_table);

        Ok(ScrapedLaptop {
            model: info_table
                .get(MODEL_INFO_TABLE_KEY)
                .ok_or(anyhow::Error::msg("missing model in info table"))?
                .clone(),
            cpu: info_table
                .get(CPU_INFO_TABLE_KEY)
                .ok_or(anyhow::Error::msg("missing cpu in info table"))?
                .clone(),
            gpu: info_table
                .get(GPU_INFO_TABLE_KEY)
                .ok_or(anyhow::Error::msg("missing gpu in info table"))?
                .clone(),
            memory: info_table
                .get(MEMORY_INFO_TABLE_KEY)
                .ok_or(anyhow::Error::msg("missing memory in info table"))?
                .parse()
                .context("failed to parse memory")?,
            weight: {
                parse_weight(
                    info_table
                        .get(WEIGHT_INFO_TABLE_KEY)
                        .ok_or(anyhow::Error::msg("missing weight in info table"))?,
                )
                .context("failed to parse weight")?
            },
            hard_drive: parse_hard_drive(
                info_table
                    .get(HARD_DRIVE_INFO_TABLE_KEY)
                    .ok_or(anyhow::Error::msg("missing hard drive in info table"))?,
            )
            .context("failed to parse hard drive")?,
            screen_size: info_table
                .get(SCREEN_SIZE_INFO_TABLE_KEY)
                .ok_or(anyhow::Error::msg("missing screen size in info table"))?
                .parse()
                .context("failed to parse screen size")?,
            manufacturer: page
                .select(&MANUFACTURER_SELECTOR)
                .next()
                .ok_or(anyhow::Error::msg("can't find laptop manufacturer element"))?
                .inner_html(),
        })
    }

    async fn load_page(
        &mut self,
        page_number: usize,
        client: &ScraperClient,
    ) -> anyhow::Result<Html> {
        let url = format!("https://www.bug.co.il/laptops/?page={}", page_number);
        Ok(client.get(url).await.context("http error")?)
    }
}

/// Parses the given info table element into the `key_values` map.
fn parse_info_table(info_table: ElementRef, key_values: &mut HashMap<String, String>) {
    for (key_node, value_node) in info_table
        .children()
        .into_iter()
        .filter_map(|node| ElementRef::wrap(node)) // only consider html elements
        .tuples()
    {
        key_values.insert(key_node.inner_html(), value_node.inner_html());
    }
}

/// Parses a weight string according to the format used in bug's website.
fn parse_weight(weight_str: &str) -> Result<Weight, BugLaptopsScraperParseWeightError> {
    let kilograms: f32 = weight_str.split(' ').next().unwrap().parse()?;
    Ok(Weight::from_grams((kilograms * 1000.0) as u32))
}

#[derive(Debug, Error)]
pub enum BugLaptopsScraperParseWeightError {
    #[error("failed to parse quantity")]
    FailedToParseQuantity(
        #[from]
        #[source]
        ParseFloatError,
    ),
}

/// Parses a hard drvie string according to the format used in bug's website.
fn parse_hard_drive(
    hard_drive_str: &str,
) -> Result<HardDrive, BugLaptopsScraperParseHardDriveError> {
    let (capacity_str, kind_str) = hard_drive_str
        .rsplit_once(' ')
        .ok_or(BugLaptopsScraperParseHardDriveError::MissingSpace)?;

    // sometimes they describe the capacity as a sum of 2 capacities in different units.
    // for example, `capacity_str` might be "1TB + 512GB"
    let capacity: Memory = match capacity_str.split_once(" + ") {
        Some((capacity1, capacity2)) => {
            capacity1.parse::<Memory>()? + capacity2.parse::<Memory>()?
        }
        None => capacity_str.parse()?,
    };

    let kind: HardDriveKind = kind_str.parse()?;

    Ok(HardDrive { capacity, kind })
}

#[derive(Debug, Error)]
pub enum BugLaptopsScraperParseHardDriveError {
    #[error("the hard drive string is missing a space which is supposed to separate the capacity and the hard drive kind")]
    MissingSpace,

    #[error("failed to parse hard drive capacity")]
    FailedToParseCapacity(
        #[from]
        #[source]
        ParseMemoryError,
    ),

    #[error("failed to parse hard drive kind")]
    FailedToParseHardDriveKind(
        #[from]
        #[source]
        strum::ParseError,
    ),
}
