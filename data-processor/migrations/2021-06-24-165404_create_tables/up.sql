CREATE TABLE laptop (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	cpu TEXT NOT NULL,
	gpu TEXT NOT NULL
);

CREATE TABLE category (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL
);

CREATE TABLE global_benchmark (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	max REAL NOT NULL,
	sum NUMERIC(18, 3) NOT NULL,
	amount BIGINT NOT NULL
);

CREATE TABLE benchmark (
	id BIGSERIAL PRIMARY KEY,
	score REAL NOT NULL,
	laptop_id INTEGER REFERENCES laptop(id) NOT NULL,
	global_benchmark_id INTEGER REFERENCES global_benchmark(id) NOT NULL
);

CREATE TABLE benchmark_score_in_category (
	id SERIAL PRIMARY KEY,
	score REAL NOT NULL,
	category_id INTEGER REFERENCES category(id) NOT NULL,
	global_benchmark_id INTEGER REFERENCES global_benchmark(id) NOT NULL
);

