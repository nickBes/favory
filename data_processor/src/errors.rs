use db_access::generate_error_types;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum DataProcessorErrorKind {
    FailedToOpenCategoriesFile,
    FailedToDeserializeCategoriesFile,
    FailedToReadLaptopsDirectory,
    FailedToOpenLaptopsFile { name: String },
    FailedToDeserializeLaptopsFile { name: String },
    DatabaseError,
}

generate_error_types! {data_processor}

