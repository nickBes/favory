mod select;
mod top_laptops;

pub use select::select;

/// infomation about a laptop return from a selection operation
#[derive(Debug, Queryable)]
pub struct SelectedLaptopInfo{
    name: String,
}
