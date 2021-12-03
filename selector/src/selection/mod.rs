mod scores_in_categories_of_laptops;
mod select;
mod top_laptops;
mod user_category_scores;

pub use select::Select;
pub use user_category_scores::UserCategoryScoresByName;

pub const TOP_LAPTOPS_AMOUNT: usize = 5;