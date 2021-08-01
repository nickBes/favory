use crate::errors::*;
use db_access::{models, schema};
use diesel::{PgConnection, QueryDsl, RunQueryDsl};
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

pub fn fetch_category_names_and_price_limits(
    db_connection: &PgConnection,
) -> Result<CategoryNamesAndPriceLimitsData> {
    let category_names: Vec<String> = {
        use schema::category::dsl::*;
        category
            .select(name)
            .load(db_connection)
            .into_selector_result(SelectorErrorKind::DatabaseError)?
    };

    let price_limits: models::PriceLimits = {
        use schema::price_limits::dsl::*;
        // the price limits table only contains a single document representing the price limits,
        // thus we use the `first` method here.
        price_limits
            .first(db_connection)
            .into_selector_result(SelectorErrorKind::DatabaseError)?
    };

    Ok(CategoryNamesAndPriceLimitsData {
        category_names,
        max_price: price_limits.max_price,
        min_price: price_limits.min_price,
    })
}
