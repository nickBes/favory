use self::generic_cli::{Cli, CliCommandEnum};
use maplit::hashmap;

mod generic_cli;

pub use generic_cli::*;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum DataProcessorCliCommand{
    Exit,
    LoadCategories,
    LoadLaptops,
    CalculateScores,
    ReloadAll,
}

impl CliCommandEnum for DataProcessorCliCommand{}

pub fn create_data_processor_cli()->Cli<DataProcessorCliCommand>{
    Cli::with_commands(hashmap!{
        "exit".to_string() => DataProcessorCliCommand::Exit,
        "load categories".to_string() => DataProcessorCliCommand::LoadCategories,
        "load laptops".to_string() => DataProcessorCliCommand::LoadLaptops,
        "calculate scores".to_string() => DataProcessorCliCommand::CalculateScores,
        "reload all".to_string() => DataProcessorCliCommand::ReloadAll,
    })
}