use db_access::models;
use serde::Serialize;
use std::collections::{HashMap, HashSet};

use crate::errors::{SelectorError, SelectorErrorKind};

pub type CategoryWeightsByName = HashMap<String, f32>;
pub type CategoryWeightsById = HashMap<i32, f32>;

pub fn map_category_weights_from_name_to_id(
    category_weights: &CategoryWeightsByName,
    categories: &Vec<models::Category>,
) -> Result<CategoryWeightsById, SelectorError> {
    let mut weights_by_id: CategoryWeightsById = HashMap::new();

    for category in categories {
        if let Some(weight) = category_weights.get(&category.name) {
            weights_by_id.insert(category.id, *weight);
        }
    }

    if weights_by_id.len() < category_weights.len() {
        let category_names: HashSet<&str> = categories
            .iter()
            .map(|category| category.name.as_str())
            .collect();

        let not_existing_category_name = category_weights
            .keys()
            .find(|&category_name| !category_names.contains(category_name.as_str()))
            .unwrap();

        return Err(
            SelectorErrorKind::NonExistentCategoryName(not_existing_category_name.clone())
                .into_empty_selector_error(),
        );
    }

    Ok(weights_by_id)
}

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
