mod load_categories;
mod load_laptops;
mod calculate_scores;
mod reload_all;
mod recalculate;

use diesel::PgConnection;
use diesel::prelude::*;
use crate::errors::*;
use db_access::schema;

pub use load_categories::*;
pub use load_laptops::*;
pub use calculate_scores::*;
pub use reload_all::*;
pub use recalculate::*;

// this function is placed in this file because 2 different commands are using it 
/// deletes all categories and all documents that depend on it from the database
/// the documents that depend on it are the benchmark scores in categories and the
/// laptop scores in categories.
fn delete_categories_and_dependents(db_connection: &PgConnection)->Result<()>{
    use schema::category;
    use schema::benchmark_score_in_category;
    use schema::laptop_score_in_category;

    diesel::delete(benchmark_score_in_category::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    diesel::delete(laptop_score_in_category::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    diesel::delete(category::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    Ok(())
}
