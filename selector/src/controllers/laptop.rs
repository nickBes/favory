use actix_web::{post, web, Responder};
use serde::{Deserialize, Serialize};

use crate::{
    dtos::CategoryWeightsByName, errors::SelectorError, services::selector::select_top_laptops,
    AppState,
};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectParams {
    category_weights: CategoryWeightsByName,
    max_price: f32,
}

#[post("/select")]
pub async fn select(
    select_params: web::Json<SelectParams>,
    app_state: web::Data<AppState>,
) -> Result<impl Responder, SelectorError> {
    select_top_laptops(
        &*app_state.db_connection.lock().await,
        &select_params.category_weights,
        select_params.max_price,
    )
    .await
    .map(|selected_laptops| web::Json(selected_laptops))
}
