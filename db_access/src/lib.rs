#[macro_use]
extern crate diesel;

pub mod models;
pub mod schema;
pub mod error_types_generator;

use diesel::{Connection, PgConnection};

pub fn get_db_connection()->PgConnection{
<<<<<<< Updated upstream
    let db_url = if cfg!(debug_assertions){
        "postgres://postgres:favory@localhost/favory".into()
    }else{
        std::env::var("DATABASE_URL").expect("the DATABASE_URL environment variable must be set")
    };
    PgConnection::establish(&db_url).unwrap()
}
=======
    PgConnection::establish("postgres://postgres:favory@localhost/favory").unwrap()
}
>>>>>>> Stashed changes
