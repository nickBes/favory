#[macro_use]
extern crate diesel;

pub mod models;
pub mod schema;

use diesel::{Connection, PgConnection};

pub fn get_db_connection()->PgConnection{
    PgConnection::establish("postgres://postgres:putin@localhost/pufferfish").unwrap()
}