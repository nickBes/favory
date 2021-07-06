use std::{collections::HashMap, net::{TcpListener, TcpStream}, time::Instant};

use crate::{errors::*, selection::SelectedLaptopInfo};
use crate::selection;
use diesel::PgConnection;
use serde::{Deserialize, Serialize};

const SERVER_ENDPOINT: &str = "127.0.0.1:4741";

#[derive(Debug, Deserialize)]
struct SelectionRequest {
    amount: usize,
    max_price: Option<f32>,
    category_scores: HashMap<String, f32>,
}

#[derive(Debug, Serialize)]
struct SelectionResponse{
    success: bool,
    laptops: Option<Vec<SelectedLaptopInfo>>,
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

fn try_handle_client(stream: &TcpStream, db_connection: &PgConnection) -> Result<()> {
    // receive the selection request from the client
    let request: SelectionRequest = serde_json::from_reader(stream)
        .into_selector_result(SelectorErrorKind::FailedToReceiveRequestFromClient)?;

    // perform the selection and measure the elapsed time
    let start = Instant::now();
    let selection_results = selection::select(
        &request.category_scores,
        request.max_price,
        request.amount,
        db_connection,
    )?;
    let elapsed = Instant::now() - start;

    // send the response to the client
    let response = SelectionResponse{
        success: true,
        laptops: Some(selection_results),
    };
    serde_json::to_writer(stream, &response)
        .into_selector_result(SelectorErrorKind::FailedToSendResponseToClient)?;

    println!("selection elapsed time: {:?}",elapsed);
    Ok(())
}

fn handle_client(stream: TcpStream, db_connection: &PgConnection)->Result<()>{
    match try_handle_client(&stream, db_connection){
        Ok(()) => Ok(()),
        Err(e)=>{
            // in case of an error, send a failure response to the client and return the error
            let response = SelectionResponse{
                success: false,
                laptops: None,
            };
            serde_json::to_writer(stream, &response)
                .into_selector_result(SelectorErrorKind::FailedToSendResponseToClient)?;
            Err(e)
        }
    }
}
