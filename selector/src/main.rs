use diesel::PgConnection;

#[macro_use]
extern crate diesel;

mod errors;
mod fetch_data;
mod selection;
mod server;

pub struct SelectorDBConnection(PgConnection);

fn main() {
    let db_connection = SelectorDBConnection(db_access::get_db_connection());

    if let Err(e) = server::start_server(&db_connection) {
        eprintln!("error: {:?}", e);
    }
}
