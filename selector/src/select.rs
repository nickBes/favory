use crate::errors::*;
use db_access::models;
use db_access::schema;
use diesel::RunQueryDsl;
use diesel::{ExpressionMethods, PgConnection, QueryDsl};
use std::collections::HashMap;
use std::collections::HashSet;

/// the user's category scores, mapping each category name to its score
type UserCategoryScores = HashMap<String, f32>;

/// the user's remapped category scores, using each category's id as the key instead of its name
type RemappedUserCategoryScores = HashMap<i32, f32>;

/// the scores in categories of each laptop, mapped by the laptop's id
type ScoresInCategoriesOfEachLaptop = HashMap<i32, ScoresInCategoriesOfLaptop>;

/// the scores in categories of a single laptop, mapped by the category id
type ScoresInCategoriesOfLaptop = HashMap<i32, f32>;

pub fn select(
    user_category_scores: &UserCategoryScores,
    optional_max_price: Option<f32>,
    db_connection: &PgConnection,
) -> Result<()> {
    if user_category_scores.is_empty() {
        return Err(SelectorErrorKind::NoScoresProvided.into_empty_selector_error());
    }

    let remapped_user_category_scores =
        remap_user_category_scores(db_connection, user_category_scores)?;
    let mapped_laptop_scores_in_categories =
        load_and_map_laptop_scores_in_categories(optional_max_price, db_connection)?;

    for (laptop_id, scores_in_categories_of_laptop) in mapped_laptop_scores_in_categories {
        let mut total_score = 0.0;
        for (&category_id, &user_category_score) in &remapped_user_category_scores {
            // get the laptop's score in the current category. if the laptop has no score for this category
            // return an error, since after the data processor runs, all laptops should have scores
            // for all categories, and it does not make sense for a laptop to not have a score for
            // some category.
            let laptop_score_in_category = match scores_in_categories_of_laptop.get(&category_id) {
                Some(score) => score,
                None => {
                    return Err(SelectorErrorKind::LaptopHasNoScoreForCategory {
                        laptop_id,
                        category_id,
                    }
                    .into_empty_selector_error())
                }
            };
            // the weighted score is the actual score of the laptop in the category, multiplied by the weight(score) that
            // the user has chosen for this category
            total_score += laptop_score_in_category*user_category_score;
        }
        println!("laptop id: {}, score: {}",laptop_id, total_score);
    }
    Ok(())
}

/// remaps the user category scores to use the category id as the key instead of the categories name
fn remap_user_category_scores(
    db_connection: &PgConnection,
    user_category_scores: &UserCategoryScores,
) -> Result<RemappedUserCategoryScores> {
    // load all categories
    let categories: Vec<models::Category> = {
        use schema::category::dsl::*;

        category
            .load(db_connection)
            .into_selector_result(SelectorErrorKind::DatabaseError)?
    };

    // map the categories
    let mut mapped_user_category_scores = RemappedUserCategoryScores::new();
    for category in &categories {
        // if the user has selected a score for this category
        if let Some(score) = user_category_scores.get(&category.name) {
            mapped_user_category_scores.insert(category.id, *score);
        }
    }

    // if not all user provided category names were found in the database
    if mapped_user_category_scores.len() < user_category_scores.len() {
        // create a set of all category names for quickly checking if a given category name exist in the database
        let found_category_names: HashSet<&str> = categories
            .iter()
            .map(|category| category.name.as_str())
            .collect();

        // find the user provided category name that didn't exist in the database
        for category_name in user_category_scores.keys() {
            if !found_category_names.contains(category_name.as_str()) {
                return Err(
                    SelectorErrorKind::NonExistentCategoryName(category_name.to_string())
                        .into_empty_selector_error(),
                );
            }
        }

        // if we got past this for loop, it means that we didn't find the missing category name, which makes no sense
        // because the amound of mapped user category scores is lower than the amount of original scores
        panic!("amount of mapped user category scores is lower than the amount of original scores, but the missing category name was not found");
    }

    Ok(mapped_user_category_scores)
}

/// loads all laptops under the given price, or if no price is given loads all laptops
fn load_and_map_laptops_with_price_under(
    optional_max_price: Option<f32>,
    db_connection: &PgConnection,
) -> Result<Vec<models::Laptop>> {
    use schema::laptop::dsl::*;

    match optional_max_price {
        Some(max_price) => {
            // a max price was selected, so load all laptops where the price is lower or equal to the given price
            laptop
                .filter(price.le(max_price))
                .load(db_connection)
                .into_selector_result(SelectorErrorKind::DatabaseError)
        }
        None => {
            // if no max price is given, load all laptops
            laptop
                .load(db_connection)
                .into_selector_result(SelectorErrorKind::DatabaseError)
        }
    }
}

fn load_and_map_laptop_scores_in_categories(
    optional_max_price: Option<f32>,
    db_connection: &PgConnection,
) -> Result<ScoresInCategoriesOfEachLaptop> {
    /// the info about the laptop score in category required for mapping the scores
    #[derive(Debug, Queryable)]
    struct LaptopScoreInCategoryInfo {
        score: f32,
        laptop_id: i32,
        category_id: i32,
    }

    // load the required info about the laptop scores in categories according to the max price bound
    let laptop_scores_in_categories: Vec<LaptopScoreInCategoryInfo> = match optional_max_price {
        Some(max_price) => {
            use schema::laptop;
            use schema::laptop_score_in_category;

            // a max price was selected, so load the scores of all laptops where the price is
            // lower or equal to the given price
            laptop_score_in_category::table
                .inner_join(laptop::table)
                .filter(laptop::price.le(max_price))
                .select((
                    laptop_score_in_category::score,
                    laptop_score_in_category::laptop_id,
                    laptop_score_in_category::category_id,
                ))
                .load(db_connection)
                .into_selector_result(SelectorErrorKind::DatabaseError)?
        }
        None => {
            use schema::laptop_score_in_category::dsl::*;

            // if no max price is given, load the scores of all laptops
            laptop_score_in_category
                .select((score, laptop_id, category_id))
                .load(db_connection)
                .into_selector_result(SelectorErrorKind::DatabaseError)?
        }
    };

    // map the laptop scores in categories by laptop id, and then by category id
    let mut scores_in_categories_of_each_laptop = ScoresInCategoriesOfEachLaptop::new();
    for laptop_score_in_category in laptop_scores_in_categories {
        scores_in_categories_of_each_laptop
            .entry(laptop_score_in_category.laptop_id)
            .or_insert_with(ScoresInCategoriesOfLaptop::new)
            .insert(
                laptop_score_in_category.category_id,
                laptop_score_in_category.score,
            );
    }

    Ok(scores_in_categories_of_each_laptop)
}
