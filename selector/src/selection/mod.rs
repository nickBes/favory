mod user_category_scores;
mod scores_in_categories_of_laptops;
mod top_laptops;
mod select;

pub use select::Select;
pub use user_category_scores::UserCategoryScoresByName;

pub const TOP_LAPTOPS_AMOUNT:usize = 5;