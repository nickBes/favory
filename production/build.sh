#!/bin/bash
./cleanup.sh
cd favory
cd selector
. dburl.sh
cargo build --release
target/release/selector &
cd ../webapp
npm run build
pkill selector
