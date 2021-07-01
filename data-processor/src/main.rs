#[macro_use]
extern crate diesel;
extern crate dotenv;

mod schema;
mod models;

use std::env;

use diesel::{Connection, PgConnection};

fn main() {
    dotenv::dotenv().ok();
    let db_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let db_connection = PgConnection::establish(&db_url).unwrap();
    println!("Successfully connected to database")
}
