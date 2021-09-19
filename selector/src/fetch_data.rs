use crate::{errors::*, SelectorDBConnection};
use db_access::{models, schema};
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl};
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

/// information that we need to query from the database
/// about a selected laptop
#[derive(Debug, Queryable)]
pub struct SelectedLaptopInfo {
    id: i32,
    name: String,
    price: f32,
    cpu: String,
    gpu: String,
}
impl SelectedLaptopInfo {
    pub fn id(&self) -> i32 {
        self.id
    }
}

/// information about a selected laptop
#[derive(Debug, Serialize)]
pub struct SelectedLaptop {
    name: String,
    price: f32,
    cpu: String,
    gpu: String,
    score: f32,
}
impl SelectedLaptop {
    pub fn new(score: f32, info: SelectedLaptopInfo) -> Self {
        Self {
            name: info.name,
            price: info.price,
            cpu: info.cpu,
            gpu: info.gpu,
            score,
        }
    }
    pub fn score(&self)->f32{
        self.score
    }
}

pub trait FetchData {
    fn fetch_category_names_and_price_limits(&self) -> Result<CategoryNamesAndPriceLimitsData>;
    fn fetch_all_categories(&self) -> Result<Vec<models::Category>>;
    fn fetch_laptop_scores_in_categories(
        &self,
        max_price: f32,
    ) -> Result<Vec<LaptopScoreInCategoryInfo>>;
    fn fetch_selected_laptops(&self, ids: &[i32]) -> Result<Vec<SelectedLaptopInfo>>;
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
    fn fetch_selected_laptops(&self, ids: &[i32]) -> Result<Vec<SelectedLaptopInfo>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        use schema::laptop::dsl::*;

        laptop
            .filter(id.eq_any(ids))
            .load(&self.0)
            .into_selector_result(SelectorErrorKind::DatabaseError)
    }
}
