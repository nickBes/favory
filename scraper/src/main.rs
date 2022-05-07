mod bug;
mod paginated_scraper;

use std::{
    fs::{File, OpenOptions},
    io::BufWriter,
    num::{ParseFloatError, ParseIntError},
    str::FromStr,
    sync::{atomic::AtomicUsize, Arc, Mutex},
};

use anyhow::Context;
use bug::BugLaptopsScraper;
use derive_more::Add;
use reqwest::{header::USER_AGENT, IntoUrl};
use scraper::Html;
use serde::Serialize;
use strum_macros::{Display, EnumString};
use thiserror::Error;

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
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ScrapedLaptop {
    model: String,
    manufacturer: String,
    cpu: String,
    gpu: String,
    memory: Memory,
    weight: Weight,
    hard_drive: HardDrive,
    screen_size: Inches,
}

const MB_PER_GB: u32 = 1000;
const MB_PER_TB: u32 = 1000000;

#[derive(PartialEq, Eq, PartialOrd, Ord, Clone, Copy, Hash, Add, Serialize)]
pub struct Memory {
    megabytes: u32,
}
impl Memory {
    pub fn from_megabytes(megabytes: u32) -> Self {
        Self { megabytes }
    }
    pub fn from_gigabytes(gigabytes: u32) -> Self {
        Self {
            megabytes: gigabytes * MB_PER_GB,
        }
    }
    pub fn from_terabytes(terabytes: u32) -> Self {
        Self {
            megabytes: terabytes * MB_PER_TB,
        }
    }
    pub fn megabytes(&self) -> u32 {
        self.megabytes
    }
    pub fn gigabytes(&self) -> u32 {
        self.megabytes / MB_PER_GB
    }
    pub fn terabytes(&self) -> u32 {
        self.megabytes / MB_PER_TB
    }
}
impl std::fmt::Display for Memory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.megabytes >= MB_PER_TB && self.megabytes % MB_PER_TB == 0 {
            write!(f, "{}TB", self.terabytes())
        } else if self.megabytes >= MB_PER_GB && self.megabytes % MB_PER_GB == 0 {
            write!(f, "{}GB", self.gigabytes())
        } else {
            write!(f, "{}MB", self.megabytes())
        }
    }
}
impl std::fmt::Debug for Memory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}
impl FromStr for Memory {
    type Err = ParseMemoryError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let multiplier = if s.ends_with("TB") {
            MB_PER_TB
        } else if s.ends_with("GB") {
            MB_PER_GB
        } else if s.ends_with("MB") {
            1
        } else {
            return Err(ParseMemoryError::MissingMemoryUnitsPostfix);
        };

        let quantity: u32 = s[..s.len() - 2].parse()?;

        Ok(Self {
            megabytes: quantity * multiplier,
        })
    }
}

#[derive(Debug, Error)]
pub enum ParseMemoryError {
    #[error("missing memory units postfix")]
    MissingMemoryUnitsPostfix,

    #[error("failed to parse quantity")]
    FailedToParseQuantity(
        #[from]
        #[source]
        ParseIntError,
    ),
}

const G_PER_KG: u32 = 1000;

#[derive(PartialEq, Eq, PartialOrd, Ord, Clone, Copy, Hash, Add, Serialize)]
pub struct Weight {
    pub grams: u32,
}
impl Weight {
    pub fn from_grams(grams: u32) -> Self {
        Self { grams }
    }
    pub fn from_kilograms(kilograms: u32) -> Self {
        Self {
            grams: kilograms * G_PER_KG,
        }
    }
    pub fn grams(&self) -> u32 {
        self.grams
    }
}

impl std::fmt::Display for Weight {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.grams >= G_PER_KG && self.grams % G_PER_KG == 0 {
            write!(f, "{}KG", self.grams / G_PER_KG)
        } else {
            write!(f, "{}G", self.grams)
        }
    }
}
impl std::fmt::Debug for Weight {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

#[derive(PartialEq, Eq, Clone, Copy, Hash, Serialize)]
pub struct HardDrive {
    pub capacity: Memory,
    pub kind: HardDriveKind,
}

impl std::fmt::Display for HardDrive {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} {}", self.capacity, self.kind)
    }
}
impl std::fmt::Debug for HardDrive {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Copy, Hash, Display, EnumString)]
pub enum HardDriveKind {
    #[strum(serialize = "SSD")]
    Ssd,

    #[strum(serialize = "eMMC")]
    Emmc,
}

impl Serialize for HardDriveKind {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_string().serialize(serializer)
    }
}

#[derive(PartialEq, PartialOrd, Clone, Copy, Add, Serialize)]
pub struct Inches(pub f32);

impl std::fmt::Display for Inches {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "\"{}", self.0)
    }
}

impl std::fmt::Debug for Inches {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

impl FromStr for Inches {
    type Err = ParseInchError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if !s.starts_with('"') {
            return Err(ParseInchError::MissingInchSymbol);
        }

        let inches = s[1..].parse()?;

        Ok(Self(inches))
    }
}

#[derive(Debug, Error)]
pub enum ParseInchError {
    #[error("missing inch symbol")]
    MissingInchSymbol,

    #[error("failed to parse quantity")]
    FailedToParseQuantity(
        #[from]
        #[source]
        ParseFloatError,
    ),
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

/// A laptops processor which just prints laptops.
#[derive(Debug, Clone)]
pub struct LaptopsCollector {
    laptops: Arc<Mutex<Vec<ScrapedLaptop>>>,
}

impl LaptopsProcessor for LaptopsCollector {
    fn process_laptop(&mut self, laptop_info: ScrapedLaptop) -> anyhow::Result<()> {
        let mut laptops = self.laptops.lock().unwrap();
        laptops.push(laptop_info);
        println!("laptops amount: {}", laptops.len());
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
    env_logger::init();
    let laptops = Arc::new(Mutex::new(Vec::new()));
    BugLaptopsScraper
        .scrape_laptops(
            ScraperClient::new(),
            // LaptopsPrinter {
            //     laptops_amount: Arc::new(AtomicUsize::new(0)),
            // },
            LaptopsCollector {
                laptops: Arc::clone(&laptops),
            },
        )
        .await
        .unwrap();

    // save laptops to file
    let file = BufWriter::new(
        OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("laptops.json")
            .expect("failed to open laptops.json file"),
    );

    let collected_laptops = Arc::try_unwrap(laptops)
        .expect("some tasks are still running")
        .into_inner()
        .unwrap();

    serde_json::to_writer_pretty(file, &collected_laptops).expect("failed to save laptops to file");
}
