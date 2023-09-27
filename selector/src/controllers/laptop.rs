use actix_web::{post, web, HttpResponse};
use std::collections::HashMap;

use crate::AppState;

type CategoryWeights = HashMap<String, f32>;

#[post("/select")]
pub async fn select(
    category_weights: web::Json<CategoryWeights>,
    app_state: web::Data<AppState>,
) -> HttpResponse {
    HttpResponse::Ok().body(category_weights.len().to_string())
}
