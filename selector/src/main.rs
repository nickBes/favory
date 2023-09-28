// use std::fs::OpenOptions;

// use diesel::PgConnection;
// use log::LevelFilter;
// use simplelog::{Config, SimpleLogger, WriteLogger};

// #[macro_use]
// extern crate diesel;

// mod fetch_data;
// mod selection;
// mod server;

// pub struct SelectorDBConnection(PgConnection);

// fn main() {
//     // initialize logger
//     if cfg!(debug_assertions) {
//         // in debug mode print logs to stdout
//         SimpleLogger::init(LevelFilter::max(), Config::default())
//             .expect("failed to initialize logger");
//     } else {
//         // in release mode print logs to file
//         let config_file = OpenOptions::new()
//             .write(true)
//             .create(true)
//             .open("log")
//             .expect("failed to open log file");
//         WriteLogger::init(LevelFilter::Info, Config::default(), config_file)
//             .expect("failed to initialize logger");
//     }

//     let db_connection = SelectorDBConnection(db_access::get_db_connection());

//     if let Err(e) = server::start_server(&db_connection) {
//         eprintln!("error: {:?}", e);
//     }
// }

mod controllers;
mod dtos;
mod errors;
mod routes;
mod services;

use crate::routes::laptop;

use actix_web::{web, App, HttpServer};
use diesel::PgConnection;
use tokio::sync::Mutex;

pub struct AppState {
    db_connection: Mutex<PgConnection>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let app_state = web::Data::new(AppState {
        db_connection: Mutex::new(db_access::get_db_connection()),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .configure(laptop::register_laptop_routes)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
