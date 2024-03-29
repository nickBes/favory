use db_access::generate_error_types;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum SelectorErrorKind{
    DatabaseError,
    NoScoresProvided,
    NonExistentCategoryName(String),
    LaptopHasNoScoreForCategory { laptop_id: i32, category_id: i32},
    FailedToCreateListener,
    FailedToAcceptClient,
    FailedToDeserializeClientRequest,
    FailedToSerializeResponse,
    TcpStreamError,
}

generate_error_types!{selector}