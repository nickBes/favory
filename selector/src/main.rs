#[macro_use]
extern crate diesel;

mod errors;
mod selection;
mod fetch_data;
mod server;

fn main() {
    let db_connection = db_access::get_db_connection();

    if let Err(e) = server::start_server(&db_connection){
        eprintln!("error: {:?}",e);
    }
}
