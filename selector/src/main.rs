use std::collections::HashMap;

#[macro_use]
extern crate diesel;

mod errors;
mod select;
mod top_laptops;

fn main() {
    let db_connection = db_access::get_db_connection();

    // test input
    let mut scores: HashMap<String, f32> = HashMap::new();
    scores.insert("dev".to_string(), 1.0);

    let res = select::select(&scores, None, 5, &db_connection);
    println!("{:#?}", res);
}
