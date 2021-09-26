use std::collections::{hash_map::Entry, HashMap};

use serde::Deserialize;

/// represents a single entry in a laptops file
#[derive(Debug, Deserialize)]
pub struct LaptopsFileEntry {
    name: String,
    url: String,
    price: f32,
    cpu: String,
    cpu_bench: LaptopPuBenchmarksData,
    gpu: String,
    gpu_bench: LaptopPuBenchmarksData,
    image_urls: Vec<String>,
}
impl LaptopsFileEntry {
    fn name_and_information(self) -> (String, LaptopInformation) {
        let LaptopsFileEntry {
            name,
            url,
            price,
            cpu,
            cpu_bench,
            gpu,
            gpu_bench,
            image_urls,
        } = self;
        (name, LaptopInformation{
            url,price,cpu,cpu_bench, gpu,gpu_bench, image_urls
        })
    }
}

#[derive(Debug)]
pub struct LaptopInformation {
    pub url: String,
    pub price: f32,
    pub cpu: String,
    pub cpu_bench: LaptopPuBenchmarksData,
    pub gpu: String,
    pub gpu_bench: LaptopPuBenchmarksData,
    pub image_urls: Vec<String>,
}

/// the benchmarks of the cpu or gpu in a laptop object from the laptops.json file,
/// mapped using each benchmark's name
pub type LaptopPuBenchmarksData = HashMap<String, f32>;

#[derive(Debug)]
pub struct LaptopSet {
    laptop_infos_by_name: HashMap<String, LaptopInformation>,
}
impl LaptopSet {
    pub fn new() -> Self {
        Self {
            laptop_infos_by_name: HashMap::new(),
        }
    }

    /// updates the laptop set with a new laptop. the laptop set will add the laptop to the
    /// map if no lapotp with this name was previously added, otherwise it will update the
    /// previously added laptop with any missing fields that were found in the new given
    /// laptop.
    pub fn update(&mut self, laptop: LaptopsFileEntry) {
        let (name, new_laptop_information) = laptop.name_and_information();
        match self.laptop_infos_by_name.entry(name) {
            Entry::Occupied(mut occupied_entry) => {
                let existing_laptop = occupied_entry.get_mut();

                // get the fields that we need from the new laptop's information
                let LaptopInformation{
                    image_urls: new_image_urls, price: new_price, url: new_url, ..
                } = new_laptop_information;

                // if the new laptop has image urls, while the existing one doesn't,
                // add the image urls of the new one to the existing laptop
                if existing_laptop.image_urls.is_empty() && !new_image_urls.is_empty(){
                    existing_laptop.image_urls = new_image_urls;
                }

                // if the new laptop's price is lower than the existing laptop's price,
                // use the price of the new laptop, which is the lower price.
                // if we use the price of the new laptop, we must also update the url
                // to the url of the new laptop
                if new_price < existing_laptop.price{
                    existing_laptop.price = new_price;
                    existing_laptop.url = new_url;
                }
            }
            Entry::Vacant(vacant_entry) => {
                // if there is no laptop with that name yet, we just insert the new laptop
                vacant_entry.insert(new_laptop_information);
            }
        }
    }

    pub fn laptop_infos_by_name(self)->HashMap<String, LaptopInformation>{
        self.laptop_infos_by_name
    }
}

pub type LaptopInfosByName = HashMap<String, LaptopInformation>;
