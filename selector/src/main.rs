use std::{collections::HashMap, time::Instant};

#[macro_use]
extern crate diesel;

mod errors;
mod selection;
mod server;

fn main() {
    let db_connection = db_access::get_db_connection();

    // test input
    let mut scores: HashMap<String, f32> = HashMap::new();
    scores.insert("dev".to_string(), 1.0);

    let start = Instant::now();
    let res = selection::select(&scores, None, 5, &db_connection);
    let elapsed = Instant::now() - start;
    println!("{:#?}", res);
    println!("elapsed: {:?}", elapsed);
}
