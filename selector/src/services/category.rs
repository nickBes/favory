use db_access::{models, schema};
use diesel::{PgConnection, RunQueryDsl};

use crate::errors::{IntoSelectorResult, SelectorError, SelectorErrorKind};

pub async fn get_all_categories(
    db_connection: &PgConnection,
) -> Result<Vec<models::Category>, SelectorError> {
    use schema::category::dsl::*;

    category
        .load(db_connection)
        .into_selector_result(SelectorErrorKind::DatabaseError)
}
