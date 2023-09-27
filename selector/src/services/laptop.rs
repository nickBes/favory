use diesel::PgConnection;

use crate::{
    dtos::{CategoryWeights, SelectedLaptop},
    errors::SelectorErrorKind,
};

pub async fn select_top_laptops(
    db_connection: &PgConnection,
    category_weights: CategoryWeights,
    max_price: f32,
) -> Result<Vec<SelectedLaptop>, SelectorErrorKind> {
    Ok(vec![])
}
