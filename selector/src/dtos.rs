use std::collections::HashMap;

use serde::Serialize;

pub type CategoryWeights = HashMap<String, f32>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedLaptop {
    pub name: String,
    pub url: String,
    pub price: f32,
    pub cpu: String,
    pub gpu: String,
    pub image_urls: Vec<String>,
    pub ram_gigabytes: i32,
    pub weight_grams: f32,
    pub scores_in_categories: HashMap<String, f32>,
    pub score: f32,
}
