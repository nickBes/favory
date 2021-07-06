use std::{
    collections::HashMap,
    net::{TcpListener, TcpStream},
};

use crate::errors::*;
use crate::selection;
use diesel::PgConnection;
use serde::Deserialize;

const SERVER_ENDPOINT: &str = "127.0.0.1:4741";

#[derive(Debug, Deserialize)]
struct SelectionRequest {
    amount: usize,
    max_price: Option<f32>,
    category_scores: HashMap<String, f32>,
}

pub fn start_server(db_connection: &PgConnection) -> Result<()> {
    let listener = TcpListener::bind(SERVER_ENDPOINT)
        .into_selector_result(SelectorErrorKind::FailedToCreateListener)?;
    for possible_stream in listener.incoming() {
        // possible stream might contain an error, so we must first check for that case
        let stream =
            possible_stream.into_selector_result(SelectorErrorKind::FailedToAcceptClient)?;
        if let Err(e) = handle_client(stream, db_connection) {
            eprintln!("error while handling client: {:?}", e);
        }
    }
    Ok(())
}

fn handle_client(stream: TcpStream, db_connection: &PgConnection) -> Result<()> {
    let request: SelectionRequest = serde_json::from_reader(&stream)
        .into_selector_result(SelectorErrorKind::FailedToReceiveRequestFromClient)?;
    let selection_results = selection::select(
        &request.category_scores,
        request.max_price,
        request.amount,
        db_connection,
    )?;
    serde_json::to_writer(&stream, selection_results.as_slice())
        .into_selector_result(SelectorErrorKind::FailedToSendResponseToClient)
}
