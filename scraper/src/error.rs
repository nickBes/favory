use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("{0}")]
    HttpError(
        #[from]
        #[source]
        reqwest::Error,
    ),
}

pub type Result<T> = std::result::Result<T, Error>;
