use std::{collections::HashMap, io::{Read, Write}, net::{TcpListener, TcpStream}, time::Instant};

use crate::selection;
use crate::{errors::*, selection::SelectedLaptopInfo};
use diesel::PgConnection;
use serde::{Deserialize, Serialize};

const SERVER_ENDPOINT: &str = "127.0.0.1:4741";
const BUFFER_SIZE: usize = 16384;

#[derive(Debug, Deserialize)]
struct SelectionRequest {
    #[serde(rename = "maxPrice")]
    max_price: f32,
    #[serde(rename = "categoryScores")]
    category_scores: HashMap<String, f32>,
}

#[derive(Debug, Serialize)]
struct SelectionResponse {
    success: bool,
    laptops: Option<Vec<SelectedLaptopInfo>>,
}

pub fn start_server(db_connection: &PgConnection) -> Result<()> {
    let mut buffer = vec![0u8; BUFFER_SIZE];
    let listener = TcpListener::bind(SERVER_ENDPOINT)
        .into_selector_result(SelectorErrorKind::FailedToCreateListener)?;
    for possible_stream in listener.incoming() {
        // possible stream might contain an error, so we must first check for that case
        let stream =
            possible_stream.into_selector_result(SelectorErrorKind::FailedToAcceptClient)?;
        if let Err(e) = handle_client(stream, &mut buffer, db_connection) {
            eprintln!("error while handling client: {:?}", e);
        }
    }
    Ok(())
}

fn handle_clients_request(
    stream: &mut TcpStream,
    buffer: &mut [u8],
    db_connection: &PgConnection,
) -> Result<()> {
    // receive and deserialize the selection request from the client
    let length = stream
        .read(buffer)
        .into_selector_result(SelectorErrorKind::TcpStreamError)?;
    // a length of 0 means that the stream has closed
    if length == 0{
        return Err(SelectorErrorKind::TcpStreamError.into_empty_selector_error())
    }
    let request: SelectionRequest = serde_json::from_slice(&buffer[..length])
        .into_selector_result(SelectorErrorKind::FailedToDeserializeClientRequest)?;

    // perform the selection and measure the elapsed time
    let start = Instant::now();
    let selection_results = selection::select(
        &request.category_scores,
        request.max_price,
        db_connection,
    )?;
    let elapsed = Instant::now() - start;

    // serialize and send the response to the client
    let response = SelectionResponse {
        success: true,
        laptops: Some(selection_results),
    };
    let serialized_response = serde_json::to_vec(&response)
        .into_selector_result(SelectorErrorKind::FailedToSerializeResponse)?;
    stream
        .write_all(&serialized_response)
        .into_selector_result(SelectorErrorKind::TcpStreamError)?;

    println!("selection elapsed time: {:?}", elapsed);
    Ok(())
}

fn handle_client(
    mut stream: TcpStream,
    buffer: &mut [u8],
    db_connection: &PgConnection,
) -> Result<()> {
    loop {
        if let Err(e) = handle_clients_request(&mut stream, buffer, db_connection) {
            // in case the error that occured is a tcp stream error,
            // the tcp stream has broke, so we should stop handling the client
            // and move on to the next client
            if e.kind == SelectorErrorKind::TcpStreamError{
                return Err(e)
            }
            println!("error while handling client: {:?}", e);

            // in case of an error, send a failure response to the client
            let response = SelectionResponse {
                success: false,
                laptops: None,
            };
            let serialized_response = serde_json::to_vec(&response)
                .into_selector_result(SelectorErrorKind::FailedToSerializeResponse)?;
            stream
                .write_all(&serialized_response)
                .into_selector_result(SelectorErrorKind::TcpStreamError)?;
        }
    }
}
