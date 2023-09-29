use diesel::PgConnection;

use crate::{
    dtos::{
        map_category_weights_from_name_to_id, CategoryWeightsById, CategoryWeightsByName,
        SelectedLaptop,
    },
    errors::{SelectorError, SelectorErrorKind},
};

use super::category::get_all_categories;

pub async fn select_top_laptops(
    db_connection: &PgConnection,
    category_weights: &CategoryWeightsByName,
    max_price: f32,
) -> Result<Vec<SelectedLaptop>, SelectorError> {
    if category_weights.is_empty() {
        return Err(SelectorErrorKind::NoScoresProvided.into_empty_selector_error());
    }

    Ok(vec![])
}

async fn get_category_weights_by_id(
    db_connection: &PgConnection,
    category_weights: &CategoryWeightsByName,
) -> Result<CategoryWeightsById, SelectorError> {
    let categories = get_all_categories(db_connection).await?;

    map_category_weights_from_name_to_id(category_weights, &categories)
}
