#!/bin/bash
export DATABASE_URL=postgres://postgres:wzKmRsYV75z6smaX@localhost/favory
cargo build --release 
target/release/selector &
