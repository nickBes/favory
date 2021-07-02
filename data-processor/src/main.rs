#[macro_use]
extern crate diesel;
extern crate dotenv;

mod schema;
mod models;
mod cli;
mod commands;
mod errors;

use std::env;

use commands::{load_categories, load_laptops, reload_all};
use diesel::{Connection, PgConnection};

use crate::cli::{DataProcessorCliCommand, create_data_processor_cli};

fn main() {
    dotenv::dotenv().unwrap();

    let mut cli = create_data_processor_cli();

    let db_url = env::var("DATABASE_URL").unwrap();
    let db_connection = PgConnection::establish(&db_url).unwrap();

    loop{
        let result = match cli.get_next_command(){
            DataProcessorCliCommand::LoadCategories => load_categories(&db_connection),
            DataProcessorCliCommand::LoadLaptops => load_laptops(&db_connection),
            DataProcessorCliCommand::ReloadAll => reload_all(&db_connection),
            DataProcessorCliCommand::Exit => break
        };
        if let Err(error) = result{
            eprintln!("Error: {:?}", error);
        }
    }
}
