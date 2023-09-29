use std::collections::HashMap;

use diesel::{ExpressionMethods, PgConnection, QueryDsl, Queryable, RunQueryDsl};

use crate::{
    dtos::CategoryWeightsById,
    errors::{IntoSelectorResult, SelectorError, SelectorErrorKind},
};
use db_access::schema;

pub struct LaptopWithScore {
    id: i32,
    score: f32,
    price: f32,
    category_scores: CategoryWeightsById,
}

pub async fn get_laptops_with_scores_within_price(
    db_connection: &PgConnection,
    category_weights: &CategoryWeightsById,
    max_price: f32,
) -> Result<HashMap<i32, LaptopWithScore>, SelectorError> {
    let mut laptops_with_scores: HashMap<i32, LaptopWithScore> = HashMap::new();

    for laptop_category_score in
        get_laptop_category_scores_within_price(db_connection, max_price).await?
    {
        laptops_with_scores
            .entry(laptop_category_score.laptop_id)
            .and_modify(|laptop_with_score| {
                laptop_with_score.category_scores.insert(
                    laptop_category_score.category_id,
                    laptop_category_score.score,
                );

                laptop_with_score.score += category_weights
                    .get(&laptop_category_score.category_id)
                    .unwrap()
                    * laptop_category_score.score;
            })
            .or_insert_with(|| {
                let mut laptop_with_score = LaptopWithScore {
                    id: laptop_category_score.laptop_id,
                    score: category_weights
                        .get(&laptop_category_score.category_id)
                        .unwrap()
                        * laptop_category_score.score,
                    price: laptop_category_score.price,
                    category_scores: HashMap::new(),
                };

                laptop_with_score.category_scores.insert(
                    laptop_category_score.category_id,
                    laptop_category_score.score,
                );

                laptop_with_score
            });
    }

    Ok(laptops_with_scores)
}

#[derive(Queryable)]
struct LaptopCategoryScore {
    laptop_id: i32,
    category_id: i32,
    price: f32,
    score: f32,
}

async fn get_laptop_category_scores_within_price(
    db_connection: &PgConnection,
    max_price: f32,
) -> Result<Vec<LaptopCategoryScore>, SelectorError> {
    use schema::laptop;
    use schema::laptop_score_in_category;

    laptop_score_in_category::table
        .inner_join(laptop::table)
        .filter(laptop::price.le(max_price))
        .select((
            laptop_score_in_category::laptop_id,
            laptop_score_in_category::category_id,
            laptop::price,
            laptop_score_in_category::score,
        ))
        .load(db_connection)
        .into_selector_result(SelectorErrorKind::DatabaseError)
}
