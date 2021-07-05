use std::collections::HashMap;

#[macro_use]
extern crate diesel;

mod select;
mod errors;

fn main() {
    let db_connection = db_access::get_db_connection();

    // test input
    let mut scores: HashMap<String, f32> = HashMap::new();
    scores.insert("dev".to_string(), 1.0);

    let res = select::select(&scores, None, &db_connection);
    println!("{:?}",res);
}
