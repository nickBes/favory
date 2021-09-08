use std::collections::HashMap;

use crate::{errors::*, fetch_data::FetchData, SelectorDBConnection};

use super::user_category_scores::UserCategoryScoresById;

/// the scores in categories of multiple laptops, by each laptop's id
#[derive(Debug)]
pub struct MappedScoresInCategoriesOfLaptops(HashMap<i32, ScoresInCategoriesOfLaptop>);
impl MappedScoresInCategoriesOfLaptops {
    /// loads and maps the scores in categories of
    pub fn load(db_connection: &SelectorDBConnection, max_price: f32) -> Result<Self> {
        let laptop_scores_in_categories =
            db_connection.fetch_laptop_scores_in_categories(max_price)?;

        // map the laptop scores in categories by laptop id, and then by category id
        let mut scores_in_categories_of_all_laptops = HashMap::new();
        for laptop_score_in_category in laptop_scores_in_categories {
            // first get or create the entry by the laptop id
            scores_in_categories_of_all_laptops
                .entry(laptop_score_in_category.laptop_id)
                .or_insert_with(|| ScoresInCategoriesOfLaptop(HashMap::new()))
                .0
                // then insert the score for this laptop by category id
                .insert(
                    laptop_score_in_category.category_id,
                    laptop_score_in_category.score,
                );
        }

        Ok(Self(scores_in_categories_of_all_laptops))
    }
    pub fn iter(&self) -> LaptopsWithScoresInCategoriesIter {
        LaptopsWithScoresInCategoriesIter {
            iter: self.0.iter(),
        }
    }
}

/// the scores in categories of a single laptop, by category id
#[derive(Debug)]
pub struct ScoresInCategoriesOfLaptop(HashMap<i32, f32>);
impl ScoresInCategoriesOfLaptop {
    fn score_in_category(&self, category_id: i32) -> Option<&f32> {
        self.0.get(&category_id)
    }
}

#[derive(Debug)]
pub struct LaptopWithScoresInCategories<'a> {
    laptop_id: i32,
    scores: &'a ScoresInCategoriesOfLaptop,
}
impl<'a> LaptopWithScoresInCategories<'a> {
    /// returns the laptop id of this laptop
    pub fn laptop_id(&self) -> i32 {
        self.laptop_id
    }
    /// calculates the total score of this laptop given the user category scores
    pub fn calculate_total_score(
        &self,
        user_category_scores: &UserCategoryScoresById,
    ) -> Result<f32> {
        let mut total_score = 0.0;
        // for each user selected category, find the laptop's score in this category
        // and multiply it by the user category score
        for (&category_id, &user_category_score) in user_category_scores.iter() {
            // get the laptop's score in the current category. if the laptop has no
            // score for this category return an error, since after the data processor
            // runs, all laptops should have scores for all categories, and it does
            // not make sense for a laptop to not have a score for some category.
            let laptop_score_in_category = match self.scores.score_in_category(category_id) {
                Some(score) => score,
                None => {
                    return Err(SelectorErrorKind::LaptopHasNoScoreForCategory {
                        laptop_id: self.laptop_id,
                        category_id,
                    }
                    .into_empty_selector_error())
                }
            };
            // the weighted score is the actual score of the laptop in the category, multiplied by the weight(score) that
            // the user has chosen for this category
            total_score += laptop_score_in_category * user_category_score;
        }
        Ok(total_score)
    }
}

#[derive(Debug)]
pub struct LaptopsWithScoresInCategoriesIter<'a> {
    iter: std::collections::hash_map::Iter<'a, i32, ScoresInCategoriesOfLaptop>,
}
impl<'a> Iterator for LaptopsWithScoresInCategoriesIter<'a> {
    type Item = LaptopWithScoresInCategories<'a>;
    fn next(&mut self) -> Option<Self::Item> {
        let (&laptop_id, scores) = self.iter.next()?;
        Some(LaptopWithScoresInCategories { laptop_id, scores })
    }
}
