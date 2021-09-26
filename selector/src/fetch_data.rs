use std::collections::HashMap;

use crate::{errors::*, SelectorDBConnection};
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
pub struct SelectedLaptop {
    pub name: String,
    pub price: f32,
    pub cpu: String,
    pub gpu: String,
    #[serde(rename = "imageUrls")]
    pub image_urls: Vec<String>,
    pub score: f32,
}

pub trait FetchData {
    fn fetch_category_names_and_price_limits(&self) -> Result<CategoryNamesAndPriceLimitsData>;
    fn fetch_all_categories(&self) -> Result<Vec<models::Category>>;
    fn fetch_laptop_scores_in_categories(
        &self,
        max_price: f32,
    ) -> Result<Vec<LaptopScoreInCategoryInfo>>;
    fn fetch_selected_laptops(
        &self,
        ids: &[i32],
        id_to_score_map: &HashMap<i32, f32>,
    ) -> Result<Vec<SelectedLaptop>>;
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
    fn fetch_selected_laptops(
        &self,
        ids: &[i32],
        id_to_score_map: &HashMap<i32, f32>,
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
            selected_laptops.push(SelectedLaptop {
                name: laptop.name,
                cpu: laptop.cpu,
                gpu: laptop.gpu,
                price: laptop.price,
                score: id_to_score_map[&laptop.id],
                image_urls,
            });
        }
        Ok(selected_laptops)
    }
}
