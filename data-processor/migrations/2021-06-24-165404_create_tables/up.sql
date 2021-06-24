CREATE TABLE laptop (
	id SERIAL PRIMARY KEY,
	cpu TEXT NOT NULL,
	gpu TEXT NOT NULL
);

CREATE TABLE category (
	id SERIAL PRIMARY KEY,
	name TEXT
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
	laptop INTEGER REFERENCES laptop(id)
);

CREATE TABLE benchmark_score_in_category (
	id SERIAL PRIMARY KEY,
	score REAL NOT NULL,
	category INTEGER REFERENCES category(id),
	global_benchmark INTEGER REFERENCES global_benchmark(id)
);

