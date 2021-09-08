use std::collections::{HashMap, HashSet};
use serde::{Serialize,Deserialize};
use crate::{errors::*, fetch_data::FetchData, SelectorDBConnection};

/// the user's category scores, mapping each category name to its score
#[derive(Debug, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserCategoryScoresByName(HashMap<String, f32>);
impl UserCategoryScoresByName {
    /// remaps the user category scores to use the category id as the key
    /// instead of the category names
    pub fn remap_key_to_category_id(
        &self,
        db_connection: &SelectorDBConnection,
    ) -> Result<UserCategoryScoresById> {
        let categories = db_connection.fetch_all_categories()?;

        // map the categories by id
        let mut user_category_scores_by_id = UserCategoryScoresById(HashMap::new());
        for category in &categories {
            // if the user has selected a score for this category
            if let Some(score) = self.0.get(&category.name) {
                user_category_scores_by_id.0.insert(category.id, *score);
            }
        }

        // if not all user provided category names were found in the database,
        // find the name of the non-existing category and return a corresponding
        // error
        if user_category_scores_by_id.0.len() < self.0.len() {
            // create a set of all category names for quickly checking if a given
            // category name exist in the database
            let existing_category_names: HashSet<&str> = categories
                .iter()
                .map(|category| category.name.as_str())
                .collect();

            // find the user provided category name that didn't exist in the database
            let non_existing_category_name = self
                .0
                .keys()
                .find(|&user_provided_category_name| {
                    !existing_category_names.contains(user_provided_category_name.as_str())
                })
                .unwrap();

            return Err(SelectorErrorKind::NonExistentCategoryName(
                non_existing_category_name.clone(),
            )
            .into_empty_selector_error());
        }

        Ok(user_category_scores_by_id)
    }
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

/// the user's category scores, mapping each category id to its score
pub struct UserCategoryScoresById(HashMap<i32, f32>);
impl UserCategoryScoresById {
    pub fn iter(&self)->std::collections::hash_map::Iter<i32,f32>{
        self.0.iter()
    }
}
