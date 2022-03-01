#!/bin/bash
cd ../selector
. dburl.sh
target/release/selector>stdout 2>stderr &
cd ../webapp
npm run start>stdout 2>stderr &
