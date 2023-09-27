use std::{
    cmp::Reverse,
    collections::{BinaryHeap, HashMap},
};

use super::{
    scores_in_categories_of_laptops::{
        MappedScoresInCategoriesOfLaptops, ScoresInCategoriesOfLaptop,
    },
    user_category_scores::UserCategoryScoresById,
};
use crate::errors::*;

#[derive(Debug)]
struct TopLaptopsEntry {
    laptop_id: i32,
    price: f32,
    score: f32,
    scores_in_categories: ScoresInCategoriesOfLaptop,
}

impl PartialEq for TopLaptopsEntry {
    fn eq(&self, other: &Self) -> bool {
        self.score == other.score
    }
}

impl Eq for TopLaptopsEntry {}

impl PartialOrd for TopLaptopsEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        if self.score == other.score {
            return self
                .price
                .partial_cmp(&other.price)
                .map(|ord| ord.reverse());
        }
        self.score.partial_cmp(&other.score)
    }
}

impl Ord for TopLaptopsEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        if self.score == other.score {
            return self.price.total_cmp(&other.price).reverse();
        }
        self.score.total_cmp(&other.score)
    }
}

/// a struct used for finding the top N laptops, given some laptops amount N
#[derive(Debug)]
pub struct TopLaptops {
    /// the entries in this vector are ordered from best to worst, such that
    /// the best laptop is at index 0
    top_laptops: BinaryHeap<Reverse<TopLaptopsEntry>>,
    amount: usize,
}

impl TopLaptops {
    pub fn new(amount: usize) -> Self {
        Self {
            top_laptops: BinaryHeap::with_capacity(amount),
            amount,
        }
    }

    pub fn find_top_laptops(
        &mut self,
        user_category_scores: &UserCategoryScoresById,
        scores_in_categories_of_laptops: &MappedScoresInCategoriesOfLaptops,
        laptop_prices: &HashMap<i32, f32>,
    ) -> Result<()> {
        for laptop_with_scores in scores_in_categories_of_laptops.iter() {
            let total_score = laptop_with_scores.calculate_total_score(user_category_scores)?;
            let price = laptop_prices.get(&laptop_with_scores.laptop_id()).unwrap();

            self.top_laptops.push(Reverse(TopLaptopsEntry {
                laptop_id: laptop_with_scores.laptop_id(),
                price: *price,
                score: total_score,
                scores_in_categories: laptop_with_scores.scores_in_categories().clone(),
            }));

            if self.top_laptops.len() > self.amount {
                self.top_laptops.pop();
            }
        }
        Ok(())
    }

    /// returns the laptop ids of the top laptops, in order
    pub fn laptop_ids(&self) -> Vec<i32> {
        self.top_laptops
            .iter()
            .map(|entry| entry.0.laptop_id)
            .collect()
    }

    /// returns a map the maps each laptop id to its score
    pub fn laptop_id_to_score_map(self) -> HashMap<i32, (f32, ScoresInCategoriesOfLaptop)> {
        self.top_laptops
            .into_iter()
            .map(|entry| {
                (
                    entry.0.laptop_id,
                    (entry.0.score, entry.0.scores_in_categories),
                )
            })
            .collect()
    }
}
