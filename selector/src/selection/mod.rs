mod select;
mod top_laptops;

pub use select::select;

pub const MAX_TOP_LAPTOPS_AMOUNT:usize = 20;

/// infomation about a laptop return from a selection operation
#[derive(Debug, Queryable)]
pub struct SelectedLaptopInfo{
    name: String,
}
