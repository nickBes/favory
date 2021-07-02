#[macro_use]
extern crate diesel;
extern crate dotenv;

mod schema;
mod models;
mod cli;
mod commands;

use std::env;

use diesel::{Connection, PgConnection};

use crate::cli::{DataProcessorCliCommand, create_data_processor_cli};

fn main() {
    dotenv::dotenv().unwrap();

    let mut cli = create_data_processor_cli();

    let db_url = env::var("DATABASE_URL").unwrap();
    let db_connection = PgConnection::establish(&db_url).unwrap();

    loop{
        match cli.get_next_command(){
            DataProcessorCliCommand::LoadCategories => println!("loading cats..."),
            DataProcessorCliCommand::Exit => break
        }
    }
}
