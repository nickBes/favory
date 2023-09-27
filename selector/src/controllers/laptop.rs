use actix_web::{post, web, HttpResponse};
use std::collections::HashMap;

type CategoryWeights = HashMap<String, f32>;

#[post("/select")]
pub async fn select(category_weights: web::Json<CategoryWeights>) -> HttpResponse {
    HttpResponse::Ok().body(category_weights.len().to_string())
}
