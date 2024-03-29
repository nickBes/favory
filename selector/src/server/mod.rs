use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    time::Instant,
};

use crate::fetch_data::FetchData;
use crate::{
    errors::*,
    selection::{Select, UserCategoryScoresByName},
    SelectorDBConnection,
};
use log::{info, error};
use serde::{Deserialize, Serialize};

const SERVER_ENDPOINT: &str = "127.0.0.1:4741";
const BUFFER_SIZE: usize = 16384;

struct ClientHandler<'buf, 'conn> {
    stream: TcpStream,
    buffer: &'buf mut [u8],
    db_connection: &'conn SelectorDBConnection,
}
impl<'buf, 'conn> ClientHandler<'buf, 'conn> {
    fn handle_client(&mut self) -> Result<()> {
        loop {
            if let Err(e) = self.handle_client_request() {
                error!("error while handling client request: {:?}", e);

                // in case the error that occured is a tcp stream error,
                // the tcp stream has broke, so we should stop handling the client
                // and move on to the next client
                if e.kind == SelectorErrorKind::TcpStreamError {
                    return Err(e);
                }

                info!("sending failure response due to error");
                // in case of an error that did not break the connection, send a failure response to the client
                let response: SelectorResponse<()> = SelectorResponse {
                    success: false,
                    content: None,
                };
                let serialized_response = serde_json::to_vec(&response)
                    .into_selector_result(SelectorErrorKind::FailedToSerializeResponse)?;
                self.stream
                    .write_all(&serialized_response)
                    .into_selector_result(SelectorErrorKind::TcpStreamError)?;
            }
        }
    }
    fn handle_client_request(&mut self) -> Result<()> {
        // receive and deserialize the selection request from the client
        let length = self
            .stream
            .read(self.buffer)
            .into_selector_result(SelectorErrorKind::TcpStreamError)?;

        info!("receved message with length: {}", length);

        // a length of 0 means that the stream has closed
        if length == 0 {
            return Err(SelectorErrorKind::TcpStreamError.into_empty_selector_error());
        }
        let request: SelectorRequest = serde_json::from_slice(&self.buffer[..length])
            .into_selector_result(SelectorErrorKind::FailedToDeserializeClientRequest)?;

        info!("received request: {:?}", request);

        info!("handling request");

        // serialize and send the response to the client
        let serialized_response =
            request.handle_request_and_serialize_response(self.db_connection)?;

        info!("response: {:?}", std::str::from_utf8(&serialized_response));

        self.stream
            .write_all(&serialized_response)
            .into_selector_result(SelectorErrorKind::TcpStreamError)?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "parameters")]
enum SelectorRequest {
    #[serde(rename = "selection")]
    Selection {
        #[serde(rename = "maxPrice")]
        max_price: f32,
        #[serde(rename = "categoryScores")]
        category_scores: UserCategoryScoresByName,
    },
    #[serde(rename = "fetchCategoryNamesAndPriceLimits")]
    FetchCategoryNamesAndPriceLimits,
}
impl SelectorRequest {
    /// handles a request, produces a response, and serializes it.
    /// note that it would seem more reasonable to just return a response here and
    /// serialize it somewhere else, but the serde Serialize trait is not object safe,
    /// so we can't just return a boxed serialiable object.
    fn handle_request_and_serialize_response(
        &self,
        db_connection: &SelectorDBConnection,
    ) -> Result<Vec<u8>> {
        match self {
            SelectorRequest::Selection {
                max_price,
                category_scores,
            } => {
                // perform the selection and measure the elapsed time
                let start = Instant::now();
                let selection_results = db_connection.select(category_scores, *max_price)?;
                let elapsed = Instant::now() - start;

                println!("selection elapsed time: {:?}", elapsed);

                serde_json::to_vec(&SelectorResponse {
                    success: true,
                    content: Some(selection_results),
                })
            }
            SelectorRequest::FetchCategoryNamesAndPriceLimits => {
                let category_names_and_price_limits =
                    db_connection.fetch_category_names_and_price_limits()?;
                serde_json::to_vec(&SelectorResponse {
                    success: true,
                    content: Some(category_names_and_price_limits),
                })
            }
        }
        .into_selector_result(SelectorErrorKind::FailedToSerializeResponse)
    }
}

#[derive(Debug, Serialize)]
struct SelectorResponse<T: Serialize> {
    success: bool,
    content: Option<T>,
}

pub fn start_server(db_connection: &SelectorDBConnection) -> Result<()> {
    let mut buffer = vec![0u8; BUFFER_SIZE];
    let listener = TcpListener::bind(SERVER_ENDPOINT)
        .into_selector_result(SelectorErrorKind::FailedToCreateListener)?;
    for possible_stream in listener.incoming() {
        // possible stream might contain an error, so we must first check for that case
        let stream =
            possible_stream.into_selector_result(SelectorErrorKind::FailedToAcceptClient)?;

        info!("new connection from: {:?}", stream.peer_addr());

        // create the handler struct containing all information required for handling the client
        let mut client_handler = ClientHandler {
            stream,
            buffer: &mut buffer,
            db_connection,
        };

        if let Err(e) = client_handler.handle_client() {
            error!("error while handling client: {:?}", e)
        }
    }
    Ok(())
}
