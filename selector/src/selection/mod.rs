mod select;
mod top_laptops;

pub use select::select;

pub const TOP_LAPTOPS_AMOUNT:usize = 5;

use serde::Serialize;

/// infomation about a laptop return from a selection operation
#[derive(Debug, Queryable, Serialize)]
pub struct SelectedLaptopInfo{
    name: String,
}
