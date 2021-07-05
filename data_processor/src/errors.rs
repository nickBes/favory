use db_access::generate_error_types;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum DataProcessorErrorKind{
    FailedToOpenCategoriesFile,
    FailedToDeserializeCategoriesFile,
    FailedToOpenLaptopsFile,
    FailedToDeserializeLaptopsFile,
    DatabaseError,
}

generate_error_types!{data_processor}