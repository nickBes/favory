use diesel::PgConnection;
use crate::errors::*;
use super::load_laptops::load_laptops;
use super::load_categories::load_categories;

pub fn reload_all(db_connection: &PgConnection)->Result<()>{
    load_laptops(db_connection)?;
    load_categories(db_connection)
}