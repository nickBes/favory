use std::collections::HashMap;

use crate::{errors::*, selection::ScoresInCategoriesOfLaptop, SelectorDBConnection};
use db_access::{models, schema};
use diesel::{BelongingToDsl, ExpressionMethods, QueryDsl, RunQueryDsl};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CategoryNamesAndPriceLimitsData {
    #[serde(rename = "categoryNames")]
    pub category_names: Vec<String>,
    #[serde(rename = "maxPrice")]
    pub max_price: f32,
    #[serde(rename = "minPrice")]
    pub min_price: f32,
}

/// information about a laptop's score in a category
#[derive(Debug, Queryable)]
pub struct LaptopScoreInCategoryInfo {
    pub score: f32,
    pub laptop_id: i32,
    pub category_id: i32,
}

/// information about a selected laptop
#[derive(Debug, Serialize)]
#[serde(rename = "camelCase")]
pub struct SelectedLaptop {
    pub name: String,
    pub url: String,
    pub price: f32,
    pub cpu: String,
    pub gpu: String,
    pub image_urls: Vec<String>,
    pub scores_in_categories: HashMap<String, f32>,
    pub score: f32,
}

pub trait FetchData {
    fn fetch_category_names_and_price_limits(&self) -> Result<CategoryNamesAndPriceLimitsData>;
    fn fetch_all_categories(&self) -> Result<Vec<models::Category>>;
    fn fetch_laptop_scores_in_categories(
        &self,
        max_price: f32,
    ) -> Result<Vec<LaptopScoreInCategoryInfo>>;
    fn fetch_laptop_prices(&self) -> Result<HashMap<i32, f32>>;
    fn fetch_selected_laptops(
        &self,
        ids: &[i32],
        id_to_scores_map: &HashMap<i32, (f32, ScoresInCategoriesOfLaptop)>,
        category_id_to_name_map: &HashMap<i32, String>,
    ) -> Result<Vec<SelectedLaptop>>;
    fn fetch_category_names(&self) -> Result<HashMap<i32, String>>;
}
impl FetchData for SelectorDBConnection {
    fn fetch_category_names_and_price_limits(&self) -> Result<CategoryNamesAndPriceLimitsData> {
        let category_names: Vec<String> = {
            use schema::category::dsl::*;
            category
                .select(name)
                .load(&self.0)
                .into_selector_result(SelectorErrorKind::DatabaseError)?
        };

        let price_limits: models::PriceLimits = {
            use schema::price_limits::dsl::*;
            // the price limits table only contains a single document representing the price limits,
            // thus we use the `first` method here.
            price_limits
                .first(&self.0)
                .into_selector_result(SelectorErrorKind::DatabaseError)?
        };

        Ok(CategoryNamesAndPriceLimitsData {
            category_names,
            max_price: price_limits.max_price,
            min_price: price_limits.min_price,
        })
    }
    fn fetch_all_categories(&self) -> Result<Vec<models::Category>> {
        use schema::category::dsl::*;

        category
            .load(&self.0)
            .into_selector_result(SelectorErrorKind::DatabaseError)
    }
    fn fetch_laptop_scores_in_categories(
        &self,
        max_price: f32,
    ) -> Result<Vec<LaptopScoreInCategoryInfo>> {
        use schema::laptop;
        use schema::laptop_score_in_category;

        // load the scores of all laptops where the price is lower or equal to the given max price
        laptop_score_in_category::table
            .inner_join(laptop::table)
            .filter(laptop::price.le(max_price))
            .select((
                laptop_score_in_category::score,
                laptop_score_in_category::laptop_id,
                laptop_score_in_category::category_id,
            ))
            .load(&self.0)
            .into_selector_result(SelectorErrorKind::DatabaseError)
    }
    fn fetch_laptop_prices(&self) -> Result<HashMap<i32, f32>> {
        use schema::laptop;

        let laptop_scores: Vec<(i32, f32)> = laptop::table
            .select((laptop::id, laptop::price))
            .load(&self.0)
            .into_selector_result(SelectorErrorKind::DatabaseError)?;

        // convert it to a hashmap mapping each laptop's id to its price
        Ok(laptop_scores.into_iter().collect())
    }
    fn fetch_selected_laptops(
        &self,
        ids: &[i32],
        id_to_scores_map: &HashMap<i32, (f32, ScoresInCategoriesOfLaptop)>,
        category_id_to_name_map: &HashMap<i32, String>,
    ) -> Result<Vec<SelectedLaptop>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        use schema::laptop;
        use schema::laptop_image;

        let laptops: Vec<models::Laptop> = laptop::table
            .filter(laptop::id.eq_any(ids))
            .load(&self.0)
            .into_selector_result(SelectorErrorKind::DatabaseError)?;
        let mut selected_laptops = Vec::new();
        for laptop in laptops {
            let image_urls: Vec<String> = models::LaptopImage::belonging_to(&laptop)
                .select(laptop_image::image_url)
                .load(&self.0)
                .into_selector_result(SelectorErrorKind::DatabaseError)?;
            let (score, scores_in_categories) = &id_to_scores_map[&laptop.id];
            selected_laptops.push(SelectedLaptop {
                name: laptop.name,
                url: laptop.url,
                cpu: laptop.cpu,
                gpu: laptop.gpu,
                price: laptop.price,
                score: *score,
                scores_in_categories: scores_in_categories
                    .clone()
                    .inner()
                    .into_iter()
                    .map(|(id, score)| (category_id_to_name_map[&id].clone(), score))
                    .collect(),
                image_urls,
            });
        }
        Ok(selected_laptops)
    }

    fn fetch_category_names(&self) -> Result<HashMap<i32, String>> {
        let category_ids_and_names: Vec<(i32, String)> = {
            use schema::category::dsl::*;
            category
                .select((id, name))
                .load(&self.0)
                .into_selector_result(SelectorErrorKind::DatabaseError)?
        };
        Ok(category_ids_and_names.into_iter().collect())
    }
}
