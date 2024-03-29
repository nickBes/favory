use super::scores_in_categories_of_laptops::MappedScoresInCategoriesOfLaptops;
use super::top_laptops::TopLaptops;
use super::user_category_scores::UserCategoryScoresByName;
use super::TOP_LAPTOPS_AMOUNT;
use crate::fetch_data::{FetchData, SelectedLaptop};
use crate::{errors::*, SelectorDBConnection};

pub trait Select {
    /// selects the top laptops given the user category scores and max price.
    fn select(
        &self,
        user_category_scores: &UserCategoryScoresByName,
        max_price: f32,
    ) -> Result<Vec<SelectedLaptop>>;
}
impl Select for SelectorDBConnection {
    fn select(
        &self,
        user_category_scores_by_name: &UserCategoryScoresByName,
        max_price: f32,
    ) -> Result<Vec<SelectedLaptop>> {
        if user_category_scores_by_name.is_empty() {
            return Err(SelectorErrorKind::NoScoresProvided.into_empty_selector_error());
        }

        // remap the user category scores to be mapped by category id instead of category name
        let user_category_scores_by_id =
            user_category_scores_by_name.remap_key_to_category_id(self)?;

        // load and map the laptop scores in categories
        let scores_in_categories_of_laptops =
            MappedScoresInCategoriesOfLaptops::load(self, max_price)?;

        let laptop_prices = self.fetch_laptop_prices()?;

        // find the top laptops
        let mut top_laptops = TopLaptops::new(TOP_LAPTOPS_AMOUNT);
        top_laptops.find_top_laptops(
            &user_category_scores_by_id,
            &scores_in_categories_of_laptops,
            &laptop_prices,
        )?;

        // we have the ids of the selected laptops, we now need to load the
        // information about them from the database
        let selected_laptop_ids = top_laptops.laptop_ids();
        let id_to_score_map = top_laptops.laptop_id_to_score_map();
        let category_id_to_name_map = self.fetch_category_names()?;
        let mut selected_laptops = self.fetch_selected_laptops(&selected_laptop_ids, &id_to_score_map, &category_id_to_name_map)?;

        // since these laptops were returned from the database, they are no longer sorted by their
        // score, so we should re-sort them by score
        selected_laptops.sort_unstable_by(|laptop1, laptop2|{
            // reverse the comparison result to sort them in descending order instead of ascending
            laptop1.score.partial_cmp(&laptop2.score).unwrap().reverse()
        });

        Ok(selected_laptops)
    }
}
