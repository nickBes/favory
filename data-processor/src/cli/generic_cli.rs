use std::{collections::HashMap, hash::Hash, io::{Read, Stdin, Stdout, Write, stdin, stdout}};

pub trait CliCommandEnum : Copy {}
pub struct Cli<T: CliCommandEnum>{
    commands: HashMap<String, T>,
    stdin: Stdin,
    stdout: Stdout,
    line: String,
}
impl<T:CliCommandEnum> Cli<T>{
    pub fn new()->Self{
        Self{
            commands: HashMap::new(),
            stdin: stdin(),
            stdout: stdout(),
            line: String::new(),
        }
    }
    pub fn with_commands(commands: HashMap<String, T>)->Self{
        Self{
            commands,
            stdin: stdin(),
            stdout: stdout(),
            line: String::new(),
        }
    }
    pub fn get_next_command(&mut self) -> T{
        loop{
            print!(">>> ");
            self.stdout.flush().unwrap();

            // clear the line before reading to make sure the input that we read from 
            // the previous call to read_line is not left in the string
            self.line.clear();

            self.stdin.read_line(&mut self.line).unwrap();

            // read_line also appends the newline character at the end of the line,
            // so we should remove it
            self.line.pop();

            if self.line == "help"{
                self.print_help();
            } else{
                match self.commands.get(&self.line){
                    Some(command) => return *command,
                    None => println!("unknown command"),
                }
            }
        }
    }
    fn print_help(&self){
        println!("available commands:");
        for command_name in self.commands.keys(){
            println!("\t{}",command_name);
        }
    }
}