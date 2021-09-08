use super::{
    scores_in_categories_of_laptops::MappedScoresInCategoriesOfLaptops,
    user_category_scores::UserCategoryScoresById,
};
use crate::errors::*;

#[derive(Debug)]
struct TopLaptopsEntry {
    laptop_id: i32,
    score: f32,
}

/// a struct used for finding the top N laptops, given some laptops amount N
#[derive(Debug)]
pub struct TopLaptops {
    /// the entries in this vector are ordered from best to worst, such that
    /// the best laptop is at index 0
    top_laptops: Vec<TopLaptopsEntry>,
    amount: usize,
}

impl TopLaptops {
    pub fn new(amount: usize) -> Self {
        Self {
            top_laptops: Vec::with_capacity(amount),
            amount,
        }
    }

    pub fn find_top_laptops(
        &mut self,
        user_category_scores: &UserCategoryScoresById,
        scores_in_categories_of_laptops: &MappedScoresInCategoriesOfLaptops,
    ) -> Result<()> {
        for laptop_with_scores in scores_in_categories_of_laptops.iter() {
            let total_score = laptop_with_scores.calculate_total_score(user_category_scores)?;
            self.update(laptop_with_scores.laptop_id(), total_score);
        }
        Ok(())
    }

    /// update the top laptops with a new laptop.
    /// if this laptop is better than any of the laptops currently in the
    /// list, it will be inserted before it.
    pub fn update(&mut self, laptop_id: i32, score: f32) {
        let mut was_better_than_any_of_top_laptops = false;
        // start from the best laptop, and go down the list, each time checking if the new
        // laptop is better than any laptop that is already in the top laptops list
        for i in 0..self.top_laptops.len() {
            // if the new laptop is better than some laptop in our current top laptops, insert the
            // new laptop right before him.
            if score > self.top_laptops[i].score {
                self.insert_laptop_at(i, laptop_id, score);

                // the laptop was better than one of the current top laptops
                was_better_than_any_of_top_laptops = true;

                // break from the loop to make sure we don't insert the new laptop multiple times,
                // since if it is better than the current laptop, it must be better than the laptops
                // after it, due to the order in which the laptops in the top_laptops vector are ordered
                break;
            }
        }

        // if the new laptop isn't better than any of our current top laptops,
        // but we don't yet have the required amount of laptops, add the new laptop as the last
        // laptop, namely the worst one
        if !was_better_than_any_of_top_laptops && self.top_laptops.len() < self.amount {
            self.top_laptops.push(TopLaptopsEntry { laptop_id, score })
        }
    }

    /// inserts a laptop at a specific index, while maintaining a correct length
    /// for the top_laptops vector
    fn insert_laptop_at(&mut self, index: usize, laptop_id: i32, score: f32) {
        // if the index is the last index in the top_laptops vector
        // we don't need to perform any more modification to the top_laptops vector other
        // than just updating the last entry according to the new laptop's information.
        //
        // note that this check is required, and if there was no check for this case, the insertion performed
        // in case this is not true would fail, since we would be deleting the last element,
        // and then trying to insert an element in place of it, which would case an error,
        // since it no longer exists.
        if index + 1 == self.amount {
            self.top_laptops[index] = TopLaptopsEntry { laptop_id, score };
            return;
        }

        // if we already filled the top_laptops vector with enough laptops, and we now want to
        // insert a new laptop, we must delete the last laptop to not overflow the required amount
        // of top laptops
        if self.top_laptops.len() == self.amount {
            self.top_laptops.pop();
        }

        self.top_laptops
            .insert(index, TopLaptopsEntry { laptop_id, score })
    }

    /// returns the laptop ids of the top laptops, in order
    pub fn laptop_ids(self) -> Vec<i32> {
        self.top_laptops
            .iter()
            .map(|entry| entry.laptop_id)
            .collect()
    }
}
