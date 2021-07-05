#[macro_use]
extern crate diesel;

pub mod models;
pub mod schema;

use std::env;

use diesel::{Connection, PgConnection};

pub fn get_db_connection()->PgConnection{
    dotenv::dotenv().unwrap();

    let db_url = env::var("DATABASE_URL").unwrap();
    PgConnection::establish(&db_url).unwrap()
}