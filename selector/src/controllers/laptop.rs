use std::vec;

use actix_web::{post, web, Responder};
use serde::{Deserialize, Serialize};

use crate::{dtos::CategoryWeights, errors::SelectorErrorKind, AppState};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectParams {
    category_weights: CategoryWeights,
    max_price: f32,
}

#[post("/select")]
pub async fn select(
    select_params: web::Json<SelectParams>,
    app_state: web::Data<AppState>,
) -> Result<impl Responder, SelectorErrorKind> {
    Ok(web::Json(select_params))
}
