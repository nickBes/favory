use diesel::PgConnection;

use crate::{
    dtos::{CategoryWeights, SelectedLaptop},
    errors::{SelectorError, SelectorErrorKind},
};

pub async fn select_top_laptops(
    db_connection: &PgConnection,
    category_weights: &CategoryWeights,
    max_price: f32,
) -> Result<Vec<SelectedLaptop>, SelectorError> {
    if category_weights.is_empty() {
        return Err(SelectorErrorKind::NoScoresProvided.into_empty_selector_error());
    }

    Ok(vec![])
}
