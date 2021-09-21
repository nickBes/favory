#[macro_use]
extern crate diesel;

pub mod models;
pub mod schema;
pub mod error_types_generator;

use diesel::{Connection, PgConnection};

pub fn get_db_connection()->PgConnection{
    let db_url = if cfg!(debug_assertions){
        "postgres://postgres:putin@localhost/favory".into()
    }else{
        std::env::var("DATABASE_URL").expect("the DATABASE_URL environment variable must be set")
    };
    PgConnection::establish(&db_url).unwrap()
}
