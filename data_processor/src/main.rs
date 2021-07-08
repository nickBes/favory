mod cli;
mod commands;
mod errors;

use std::{time::Instant};

use commands::{calculate_scores, load_categories, load_laptops, reload_all};

use crate::cli::{DataProcessorCliCommand, create_data_processor_cli};

fn main() {
    let mut cli = create_data_processor_cli();
    let db_connection = db_access::get_db_connection();

    loop{
        let start = Instant::now();
        let result = match cli.get_next_command(){
            DataProcessorCliCommand::LoadCategories => load_categories(&db_connection),
            DataProcessorCliCommand::LoadLaptops => load_laptops(&db_connection),
            DataProcessorCliCommand::CalculateScores => calculate_scores(&db_connection),
            DataProcessorCliCommand::ReloadAll => reload_all(&db_connection),
            DataProcessorCliCommand::Exit => break
        };
        match result{
            Ok(())=>{
                let elapsed = Instant::now() - start;
                println!("elapsed: {:?}", elapsed);
            },
            Err(error) => {
                eprintln!("Error: {:?}", error);
            }
        }
    }
}
