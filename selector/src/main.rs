use std::fs::OpenOptions;

use diesel::PgConnection;
use log::LevelFilter;
use simplelog::{Config, SimpleLogger, WriteLogger};

#[macro_use]
extern crate diesel;

mod errors;
mod fetch_data;
mod selection;
mod server;

pub struct SelectorDBConnection(PgConnection);

fn main() {
    // initialize logger
    if cfg!(debug_assertions) {
        // in debug mode print logs to stdout
        SimpleLogger::init(LevelFilter::max(), Config::default()).expect("failed to initialize logger");
    } else{
        // in release mode print logs to file
        let config_file = OpenOptions::new().write(true).create(true).open("log").expect("failed to open log file");
        WriteLogger::init(LevelFilter::Warn, Config::default(), config_file).expect("failed to initialize logger");
    }

    let db_connection = SelectorDBConnection(db_access::get_db_connection());

    if let Err(e) = server::start_server(&db_connection) {
        eprintln!("error: {:?}", e);
    }
}
