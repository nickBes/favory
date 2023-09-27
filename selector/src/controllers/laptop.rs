use actix_web::{post, web, HttpResponse};
use serde::Deserialize;

use crate::{dtos::CategoryWeights, AppState};

#[derive(Deserialize)]
pub struct SelectParams {
    category_weights: CategoryWeights,
    max_price: f32,
}

#[post("/select")]
pub async fn select(
    select_params: web::Json<SelectParams>,
    app_state: web::Data<AppState>,
) -> HttpResponse {
    HttpResponse::Ok().body(select_params.category_weights.len().to_string())
}
