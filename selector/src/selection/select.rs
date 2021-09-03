use super::TOP_LAPTOPS_AMOUNT;
use super::{top_laptops::TopLaptops, SelectedLaptopInfo};
use crate::errors::*;
use db_access::{models, schema};
use diesel::RunQueryDsl;
use diesel::{ExpressionMethods, PgConnection, QueryDsl};
use std::collections::HashMap;
use std::collections::HashSet;

/// the user's category scores, mapping each category name to its score
type UserCategoryScores = HashMap<String, f32>;

/// the user's remapped category scores, using each category's id as the key instead of its name
type RemappedUserCategoryScores = HashMap<i32, f32>;

/// the scores in categories of all laptops, mapped by the laptop's id, and then by category id
type ScoresInCategoriesOfAllLaptops = HashMap<i32, ScoresInCategoriesOfLaptop>;

/// the scores in categories of a single laptop, mapped by the category id
type ScoresInCategoriesOfLaptop = HashMap<i32, f32>;

/// selects the top laptops given the user category scores and max price.
pub fn select(
    user_category_scores: &UserCategoryScores,
    max_price: f32,
    db_connection: &PgConnection,
) -> Result<Vec<SelectedLaptopInfo>> {
    if user_category_scores.is_empty() {
        return Err(SelectorErrorKind::NoScoresProvided.into_empty_selector_error());
    }

    // remap the user category scores to be mapped by category id instead of category name
    let remapped_user_category_scores =
        remap_user_category_scores(db_connection, user_category_scores)?;

    // load the laptop scores in categories and map them by laptop id, and then by category id
    let mapped_laptop_scores_in_categories =
        load_and_map_laptop_scores_in_categories(max_price, db_connection)?;

    // find the top laptops
    let mut top_laptops = TopLaptops::new(TOP_LAPTOPS_AMOUNT);
    find_top_laptops(
        &mut top_laptops,
        &remapped_user_category_scores,
        &mapped_laptop_scores_in_categories,
    )?;

    // we have the ids of the top laptops, we now need to find the information about them
    let top_laptop_ids = top_laptops.get_ids();
    get_top_laptops_information(&top_laptop_ids, db_connection)
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

/// returns information about the top laptops given their ids
fn get_top_laptops_information(
    top_laptop_ids: &[i32],
    db_connection: &PgConnection,
) -> Result<Vec<SelectedLaptopInfo>> {
    if top_laptop_ids.is_empty() {
        return Ok(Vec::new());
    }

    use schema::laptop::dsl::*;

    laptop
        .filter(id.eq_any(top_laptop_ids))
        .select((name,price,cpu,gpu))
        .load(db_connection)
        .into_selector_result(SelectorErrorKind::DatabaseError)
}

/// load the scores of all laptop under the given price, or if no price is given loads the scores
/// of all laptops. After loading the scores it maps them by laptop id, and then by category id
fn load_and_map_laptop_scores_in_categories(
    max_price: f32,
    db_connection: &PgConnection,
) -> Result<ScoresInCategoriesOfAllLaptops> {
    /// the info about the laptop score in category required for mapping the scores
    #[derive(Debug, Queryable)]
    struct LaptopScoreInCategoryInfo {
        score: f32,
        laptop_id: i32,
        category_id: i32,
    }

    // load the required info about the laptop scores in categories according to the max price bound
    let laptop_scores_in_categories: Vec<LaptopScoreInCategoryInfo> = {
        use schema::laptop;
        use schema::laptop_score_in_category;

        // load the scores of all laptops where the price is lower or equal to the given max price
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
    };

    // map the laptop scores in categories by laptop id, and then by category id
    let mut scores_in_categories_of_all_laptops = ScoresInCategoriesOfAllLaptops::new();
    for laptop_score_in_category in laptop_scores_in_categories {
        scores_in_categories_of_all_laptops
            .entry(laptop_score_in_category.laptop_id)
            .or_insert_with(ScoresInCategoriesOfLaptop::new)
            .insert(
                laptop_score_in_category.category_id,
                laptop_score_in_category.score,
            );
    }

    Ok(scores_in_categories_of_all_laptops)
}

/// find the top laptops, according to the user category scores and the scores in categories
/// of all laptops, and stores the result in `top_laptops`.
fn find_top_laptops(
    top_laptops: &mut TopLaptops,
    remapped_user_category_scores: &RemappedUserCategoryScores,
    mapped_laptop_scores_in_categories: &ScoresInCategoriesOfAllLaptops,
) -> Result<()> {
    for (&laptop_id, scores_in_categories_of_laptop) in mapped_laptop_scores_in_categories {
        let mut total_score = 0.0;
        for (&category_id, &user_category_score) in remapped_user_category_scores {
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
            total_score += laptop_score_in_category * user_category_score;
        }
        top_laptops.update(laptop_id, total_score);
    }
    Ok(())
}
