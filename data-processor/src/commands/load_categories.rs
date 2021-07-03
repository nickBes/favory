use crate::errors::*;
use crate::models;
use diesel::prelude::*;

use diesel::PgConnection;
use serde::Deserialize;
use std::{collections::HashMap, fs::OpenOptions};

const CATEGORIES_FILE_PATH: &str = "categories.json";

/// this is the default pattern that is used when matching the benchmarks with the categories file,
/// and the benchmark's name does not match any non-default pattern.
const DEFAULT_PATTERN: &str = "*";

/// this is the score that is used when matching the benchmarks with the categories file, and the benchmark's name
/// does not match any non-default pattern, and there is no default pattern (no "*" entry).
const DEFAULT_BENCHMARK_SCORE_IN_CATEGORY: f32 = 1.0;

/// the information about benchmark scores in each category loaded from the categories file
type CategoriesFile = HashMap<String, CategoryPatternScores>;

#[derive(Debug, Deserialize)]
struct CategoryPatternScores {
    cpu: HashMap<String, f32>,
    gpu: HashMap<String, f32>,
}

/// the score of each benchmark in each category according to the categories.json file, mapped using the categories' ids
type BenchmarkScoresInEachCategory = HashMap<i32, BenchmarkScoresInCategory>;

/// the score of each benchmark, in each pu type, in a specific category, according to the categories.json file, mapped
/// using the global benchmarks' ids. There is no need to seperate pu types here since the key is the id of a global benchmark,
/// and that global benchmark can be either a cpu benchmark or a gpu benchmark.
type BenchmarkScoresInCategory = HashMap<i32, f32>;

/// loads the categories to the database and performs all required calculations
pub fn load_categories(db_connection: &PgConnection) -> Result<()> {
    use crate::schema::global_benchmark::dsl::*;

    println!("deleting categories and dependents...");
    // first delete all categories and their dependents from the table, so that we don't have duplicates.
    // note that no update mechanism is used here even though it could increase performance,
    // because the data-processor currently only needs to run once, and performs no recalculations.
    super::delete_categories_and_dependents(db_connection)?;

    println!("loading the categories file...");
    let categories_file = parse_categories_file()?;

    println!("inserting and mapping categories...");
    let categories_id_by_name = insert_and_map_categories(&categories_file, db_connection)?;
    println!("inserted {} categories", categories_id_by_name.len());

    println!("loading global benchmarks...");
    // we need the global benchmark since the categories.json file only contains patterns to match the benchmarks against,
    // not the actual names of the benchmarks, so we must loop through each benchmark and match it to a pattern.
    let global_benchmarks: Vec<models::GlobalBenchmark> = global_benchmark
        .load(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    println!("loaded {} global benchmarks", global_benchmarks.len());

    println!("matching global benchmarks with categories...");
    // match each benchmark to a pattern and give him the pattern's score
    let mut scores = match_global_benchmarks_with_categories(
        global_benchmarks,
        &categories_file,
        &categories_id_by_name,
    );

    println!("normalizing scores...");
    // normalize the matched scores
    normalize_bencmark_scores(&mut scores);

    println!("inserting benchmark scores in each category...");
    // insert the normalized scores to the database
    insert_benchmark_scores_in_each_category(scores, db_connection)?;

    println!("successfully loaded categories");
    Ok(())
}

/// inserts the categories to the database. returns a hashmap that maps a category name to its id in the database.
fn insert_and_map_categories(
    categories_file: &CategoriesFile,
    db_connection: &PgConnection,
) -> Result<HashMap<String, i32>> {
    use crate::schema::category;

    let new_categories: Vec<models::NewCategory> = categories_file
        .keys()
        .map(|category_name| models::NewCategory {
            name: &category_name,
        })
        .collect();

    let inserted_categories: Vec<models::Category> = diesel::insert_into(category::table)
        .values(new_categories.as_slice())
        .get_results(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

    let mut categories_ids_by_name = HashMap::new();
    for category in inserted_categories {
        categories_ids_by_name.insert(category.name, category.id);
    }
    Ok(categories_ids_by_name)
}

/// in the categories file, a score is given to each benchmark, in each cateogry, but the
/// score does not mention the direct name of the benchmark, it uses pattern matching to
/// match multiple benchmarks. This function checks which pattern each global benchmark
/// matches to, and gives each benchmark a score according to the first matched pattern.
fn match_global_benchmarks_with_categories(
    global_benchmarks: Vec<models::GlobalBenchmark>,
    categories_file: &CategoriesFile,
    categories_id_by_name: &HashMap<String, i32>,
) -> BenchmarkScoresInEachCategory {
    let mut benchmark_scores_in_each_category = BenchmarkScoresInEachCategory::new();
    for (category_name, category_pattern_scores) in categories_file {
        // record the scores of all benchmarks in the current category, and then add all of these together
        // to the benchmark_scores_in_each_category
        let mut benchmark_scores_in_current_category = BenchmarkScoresInCategory::new();

        // find each benchmark's score by first trying to match him with all the patterns,
        // and otherwise using the default pattern or the default score (if no default pattern exists)
        for benchmark in &global_benchmarks {
            // find the correct patterns and scores map, and the correct result scores map, according to
            // the benchmark's pu type
            let benchmarks_patterns_and_scores = match benchmark.pu_type() {
                models::PuType::Cpu => &category_pattern_scores.cpu,
                models::PuType::Gpu => &category_pattern_scores.gpu,
            };
            let mut found_matching_pattern = false;
            for (pattern, score) in benchmarks_patterns_and_scores {
                // skip the default pattern, because here we first want to check all the non-default patterns,
                // and since a hashmap is used the order of the entries in the file is not preserved, so the default
                // pattern might not be the last. The check for the default is used later, if non of the non-default
                // pattern worked
                if pattern == "*" {
                    continue;
                }
                if benchmark_name_matches_pattern(benchmark.name_without_prefix(), &pattern) {
                    found_matching_pattern = true;

                    benchmark_scores_in_current_category.insert(benchmark.id, *score);

                    break;
                }
            }
            // if none of the non-default patterns worked for the current benchmark, use the default pattern
            if !found_matching_pattern {
                // the score is the value of the default pattern, or the default benchmark score,
                // if there is no default pattern
                let score = benchmarks_patterns_and_scores
                    .get(DEFAULT_PATTERN)
                    .unwrap_or(&DEFAULT_BENCHMARK_SCORE_IN_CATEGORY);

                benchmark_scores_in_current_category.insert(benchmark.id, *score);
            }
        }

        // here we have found the score of each benchmark in the current cateogry, all that's left is to add it to the
        // results map. But the results map is mapped using each category's id, not name, so we must first find the
        // current category's id using the categories_id_by_name map.
        let category_id = *categories_id_by_name.get(category_name).unwrap();
        benchmark_scores_in_each_category.insert(category_id, benchmark_scores_in_current_category);
    }
    benchmark_scores_in_each_category
}

/// normalizes the benchmark scores in each category by dividing each score by the sum of all scores
fn normalize_bencmark_scores(
    benchmark_scores_in_each_category: &mut BenchmarkScoresInEachCategory,
) {
    for benchmark_scores_in_category in benchmark_scores_in_each_category.values_mut() {
        let sum: f32 = benchmark_scores_in_category.values().sum();
        for score in benchmark_scores_in_category.values_mut() {
            *score /= sum;
        }
    }
}

/// accepts a hashmap that maps each category id to the scores of the benchmarks in that category,
/// converts it to a vector of insertable structs, and inserts it into the database
fn insert_benchmark_scores_in_each_category(
    scores: HashMap<i32, BenchmarkScoresInCategory>,
    db_connection: &PgConnection,
) -> Result<()> {
    use crate::schema::benchmark_score_in_category;

    // each item represents the score of a single benchmark in a single category
    // the pu types here are encoded into the name of the benchmark such that if the benchmark
    // is a cpu benchmark, the first character of the name will be the letter 'c', and if the benchmark
    // is a gpu benchmark, the first character of the name will be the letter 'g'.
    let mut new_benchmark_scores_in_categories = Vec::new();

    // convert the scores map to a vector of new records, so that we can insert them into
    // the database
    for (category_id, benchmark_scores_in_category) in scores {
        for (global_benchmark_id, score) in benchmark_scores_in_category {
            new_benchmark_scores_in_categories.push(models::NewBenchmarkScoreInCategory{
                category_id, global_benchmark_id, score
            })
        }
    }

    // perform the insertion to the database
    // note that execute is used here and not get_results since we don't care about whatever
    // was inserted, we only need to now that the operation has succeeded.
    diesel::insert_into(benchmark_score_in_category::table)
        .values(&new_benchmark_scores_in_categories)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    
    Ok(())
}

/// checks if the given benchmark name matches the given pattern. The pattern mentioned here is the pattern that is used in the
/// categories.json file to match benchmark names to a given score.
fn benchmark_name_matches_pattern(benchmark_name: &str, pattern: &str) -> bool {
    for required_sequence in pattern.split("&&") {
        if !benchmark_name.contains(required_sequence) {
            return false;
        }
    }
    true
}

fn parse_categories_file() -> Result<CategoriesFile> {
    let categories_file = OpenOptions::new()
        .read(true)
        .open(CATEGORIES_FILE_PATH)
        .into_data_processor_result(DataProcessorErrorKind::FailedToOpenCategoriesFile)?;
    serde_json::de::from_reader(categories_file)
        .into_data_processor_result(DataProcessorErrorKind::FailedToDeserializeCategoriesFile)
}
