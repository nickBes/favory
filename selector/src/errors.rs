use actix_web::ResponseError;
use db_access::generate_error_types;
use std::fmt::Display;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum SelectorErrorKind {
    DatabaseError,
    NoScoresProvided,
    NonExistentCategoryName(String),
    LaptopHasNoScoreForCategory { laptop_id: i32, category_id: i32 },
    FailedToCreateListener,
    FailedToAcceptClient,
    FailedToDeserializeClientRequest,
    FailedToSerializeResponse,
    TcpStreamError,
}

generate_error_types! {selector}

impl Display for SelectorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Selector error")
    }
}

impl ResponseError for SelectorError {
    fn status_code(&self) -> actix_web::http::StatusCode {
        actix_web::http::StatusCode::INTERNAL_SERVER_ERROR
    }
}
