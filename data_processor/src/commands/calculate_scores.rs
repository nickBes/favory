use std::collections::HashMap;

use crate::errors::*;
use db_access::{models,schema};
use bigdecimal::{BigDecimal, ToPrimitive};
use diesel::prelude::*;

use diesel::PgConnection;

/// maps the benchmarks by the laptop id, and then by global benchmark id
type MappedBenchmarks = HashMap<i32, BenchmarksByGlobalBenchmarkId>;

/// maps the benchmarks by global benchmark id
type BenchmarksByGlobalBenchmarkId = HashMap<i32, f32>;

/// maps the benchmark scores in categories by category id, and then by global benchmark id
type MappedBenchmarkScoresInCategories =
    HashMap<i32, BenchmarkScoresInCategoriesByGlobalBenchmarkId>;

/// maps the benchmark scores in categories by global benchmark id
type BenchmarkScoresInCategoriesByGlobalBenchmarkId = HashMap<i32, f32>;

/// this is information about each global benchmark that is required for calculating the laptop's score
struct GlobalBenchmarkInfo {
    max: f32,
    sum: BigDecimal,
    amount: i64,
}
impl GlobalBenchmarkInfo {
    fn average(&self) -> f32 {
        // it is safe to unwrap here since, if the max can be stored as an f32, then the average must be
        // in the range of f32
        (&self.sum / self.amount).to_f32().unwrap()
    }
}

/// maps the global benchmarks by global benchmark id
type MappedGlobalBenchmarks = HashMap<i32, GlobalBenchmarkInfo>;

/// calculates the scores of each laptop in each category and caches it.
pub fn calculate_scores(db_connection: &PgConnection) -> Result<()> {
    // load and map the required data from the database
    println!("loading an mapping benchmarks...");
    let mapped_benchmarks = load_and_map_benchmarks(db_connection)?;
    println!("loading an mapping global benchmarks...");
    let mapped_global_benchmarks = load_and_map_global_benchmarks(db_connection)?;
    println!("loading an mapping benchmark scores in categories...");
    let mapped_benchmark_scores_in_categories =
        load_and_map_benchmark_scores_in_categories(db_connection)?;

    println!("calculating laptop scores in categories...");
    // calculate the scores
    let new_laptop_scores_in_categories = calculate_laptop_scores_in_each_category(
        &mapped_benchmarks,
        &mapped_benchmark_scores_in_categories,
        &mapped_global_benchmarks,
    );

    println!("inserting scores into the database...");
    // save the scores to the database
    insert_scores(&new_laptop_scores_in_categories, db_connection)?;

    println!("successfully calculated scores");
    Ok(())
}

/// loads all benchmarks and maps them by global benchmark id and then by laptop id
fn load_and_map_benchmarks(db_connection: &PgConnection) -> Result<MappedBenchmarks> {
    let benchmarks: Vec<models::Benchmark> = {
        use schema::benchmark::dsl::*;
        benchmark
            .load(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?
    };

    let mut result = MappedBenchmarks::new();
    for benchmark in benchmarks {
        result
            .entry(benchmark.laptop_id)
            .or_insert_with(BenchmarksByGlobalBenchmarkId::new)
            .insert(benchmark.global_benchmark_id, benchmark.score);
    }
    Ok(result)
}

/// loads all global benchmarks and maps them by global benchmark id
fn load_and_map_global_benchmarks(db_connection: &PgConnection) -> Result<MappedGlobalBenchmarks> {
    let global_benchmarks: Vec<models::GlobalBenchmark> = {
        use schema::global_benchmark::dsl::*;

        global_benchmark
            .load(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?
    };

    let mut result = MappedGlobalBenchmarks::new();
    for global_benchmark in global_benchmarks {
        result.insert(
            global_benchmark.id,
            GlobalBenchmarkInfo {
                max: global_benchmark.max,
                sum: global_benchmark.sum,
                amount: global_benchmark.amount,
            },
        );
    }
    Ok(result)
}

/// loads all benchmark scores in categories and maps them by category id and then by global benchmark id
fn load_and_map_benchmark_scores_in_categories(
    db_connection: &PgConnection,
) -> Result<MappedBenchmarkScoresInCategories> {
    let benchmark_scores_in_categories: Vec<models::BenchmarkScoreInCategory> = {
        use schema::benchmark_score_in_category::dsl::*;
        benchmark_score_in_category
            .load(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?
    };

    let mut result = MappedBenchmarkScoresInCategories::new();
    for benchmark_score_in_category in benchmark_scores_in_categories {
        result
            .entry(benchmark_score_in_category.category_id)
            .or_insert_with(BenchmarksByGlobalBenchmarkId::new)
            .insert(
                benchmark_score_in_category.global_benchmark_id,
                benchmark_score_in_category.score,
            );
    }
    Ok(result)
}

/// performs the actual calculation of the scores of each laptop in each category, and returns a vector
/// of insertable structs that represent these scores
fn calculate_laptop_scores_in_each_category(
    mapped_benchmarks: &MappedBenchmarks,
    mapped_benchmark_scores_in_categories: &MappedBenchmarkScoresInCategories,
    mapped_global_benchmarks: &MappedGlobalBenchmarks,
) -> Vec<models::NewLaptopScoreInCategory> {
    let mut result = Vec::new();
    for (laptop_id, laptop_scores_in_benchmarks) in mapped_benchmarks {
        for (category_id, benchmark_scores_in_categories_by_global_benchmark_id) in
            mapped_benchmark_scores_in_categories
        {
            let mut score_in_category = 0.0;
            for (global_benchmark_id, benchmark_score_in_category) in
                benchmark_scores_in_categories_by_global_benchmark_id
            {
                let global_benchmark_info =
                    mapped_global_benchmarks.get(&global_benchmark_id).unwrap();
                let score_in_benchmark = match laptop_scores_in_benchmarks.get(&global_benchmark_id)
                {
                    Some(&score) => score,
                    None => {
                        // if the laptop has no score for this benchmark, we should give him the average score
                        global_benchmark_info.average()
                    }
                };
                let normalized_score_in_benchmark = score_in_benchmark / global_benchmark_info.max;
                score_in_category += normalized_score_in_benchmark * benchmark_score_in_category;
            }
            result.push(models::NewLaptopScoreInCategory {
                score: score_in_category,
                laptop_id: *laptop_id,
                category_id: *category_id,
            });
        }
    }
    result
}

/// inserts the laptop scores in categories into the database
fn insert_scores(
    scores: &[models::NewLaptopScoreInCategory],
    db_connection: &PgConnection,
) -> Result<()> {
    use schema::laptop_score_in_category;

    // before inserting we delete all previous laptop scores in categories from the table,
    // since they are now outdated.
    diesel::delete(laptop_score_in_category::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

    diesel::insert_into(laptop_score_in_category::table)
        .values(scores)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

    Ok(())
}
