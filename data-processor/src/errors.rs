use std::error::Error;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum DataProcessorErrorKind{
    FailedToOpenCategoriesFile,
    FailedToDeserializeCategoriesFile,
    FailedToOpenLaptopsFile,
    FailedToDeserializeLaptopsFile,
    DatabaseError,
}

#[derive(Debug)]
pub struct DataProcessorError{
    kind: DataProcessorErrorKind,
    inner: Option<Box<dyn Error>>,
}

pub type Result<T> = std::result::Result<T, DataProcessorError>;

pub trait IntoEmptyDataProcessorResult<T>{
    fn into_empty_data_processor_result(self, error_kind: DataProcessorErrorKind)->Result<T>;
}

impl<T,E> IntoEmptyDataProcessorResult<T> for std::result::Result<T,E>{
    fn into_empty_data_processor_result(self, error_kind: DataProcessorErrorKind) ->Result<T> {
        self.map_err(|_| DataProcessorError{
            kind: error_kind,
            inner: None,
        })
    }
}

pub trait IntoDataProcessorResult<T>{
    fn into_data_processor_result(self, error_kind: DataProcessorErrorKind)->Result<T>;
}
impl<T,E: Error + 'static> IntoDataProcessorResult<T> for std::result::Result<T,E>{
    fn into_data_processor_result(self, error_kind: DataProcessorErrorKind) ->Result<T> {
        self.map_err(|err| DataProcessorError{
            kind: error_kind,
            inner: Some(Box::new(err))
        })
    }
}