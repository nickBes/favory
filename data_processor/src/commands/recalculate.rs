use crate::commands::{
    calculate_laptop_scores_in_each_category, insert_scores,
    load_and_map_benchmark_scores_in_categories, PriceLimits,
};
use crate::commands::{upsert_price_limits, GlobalBenchmarkInfo};
use crate::laptop_set::LaptopInfosByName;
use crate::laptop_set::LaptopPuBenchmarksData;
use crate::{
    commands::{
        convert_benchmarks_to_insertable_structs, convert_image_urls_to_insertable_structs,
        parse_laptops_files,
    },
    errors::*,
};
use db_access::{models, schema};
use diesel::{pg::upsert::excluded, prelude::*};

use diesel::PgConnection;
use std::collections::HashMap;

use super::{MappedBenchmarks, MappedGlobalBenchmarks};

const RECALCULATION_LAPTOPS_DIR_PATH: &str = "recalc";

/// Information about a global benchmark that might be, or might not be in the database.
enum UpdateableGlobalBenchmark {
    InDatabase {
        id: i32,
        was_modified: bool,
        info: GlobalBenchmarkInfo,
    },
    NotIntDatabase(GlobalBenchmarkInfo),
}
impl UpdateableGlobalBenchmark {
    pub fn new_not_in_database() -> Self {
        Self::NotIntDatabase(GlobalBenchmarkInfo::new())
    }
    pub fn update(&mut self, score: f32) {
        match self {
            UpdateableGlobalBenchmark::InDatabase {
                info, was_modified, ..
            } => {
                info.update(score);
                *was_modified = true;
            }
            UpdateableGlobalBenchmark::NotIntDatabase(info) => info.update(score),
        }
    }
}

pub fn recalculate(db_connection: &PgConnection) -> Result<()> {
    println!("loading the laptops file...");
    let laptops = parse_laptops_files(RECALCULATION_LAPTOPS_DIR_PATH)?;

    println!("loading global benchmarks...");
    let mut global_benchmarks = load_global_benchmarks(db_connection)?;
    println!("loaded {} global benchmarks", global_benchmarks.len());

    println!("updating global benchmarks according to new laptops...");
    update_global_benchmarks(&laptops, &mut global_benchmarks);

    println!("upserting updated global benchmarks...");
    let global_benchmarks_id_by_name =
        upsert_updated_global_benchmarks(db_connection, &global_benchmarks)?;
    println!("upserted {} global benchmarks", global_benchmarks.len());

    println!("upsering laptops, benchmarks and image urls...");
    let (price_limits, mapped_benchmarks) = upsert_laptops_benchmarks_and_image_urls(
        &laptops,
        &global_benchmarks_id_by_name,
        db_connection,
    )?;
    println!("upserted {} laptops", laptops.len());

    println!("upserting price limits...");
    upsert_price_limits(&price_limits, db_connection)?;

    println!("mapping global benchmarks...");
    let mapped_global_benchmarks =
        mapped_global_benchmarks(global_benchmarks, &global_benchmarks_id_by_name);

    println!("loading an mapping benchmark scores in categories...");
    let mapped_benchmark_scores_in_categories =
        load_and_map_benchmark_scores_in_categories(db_connection)?;

    // calculate the scores
    println!("calculating laptop scores in categories...");
    let new_laptop_scores_in_categories = calculate_laptop_scores_in_each_category(
        &mapped_benchmarks,
        &mapped_benchmark_scores_in_categories,
        &mapped_global_benchmarks,
    );

    println!("inserting scores into the database...");
    // save the scores to the database
    insert_scores(&new_laptop_scores_in_categories, db_connection)?;

    println!("successfully recalculated scores");

    Ok(())
}

fn load_global_benchmarks(
    db_connection: &PgConnection,
) -> Result<HashMap<String, UpdateableGlobalBenchmark>> {
    let results: Vec<models::GlobalBenchmark> = {
        use schema::global_benchmark::dsl::*;
        global_benchmark
            .load(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?
    };

    Ok(results
        .into_iter()
        .map(|global_benchmark| {
            let models::GlobalBenchmark {
                id,
                name,
                max,
                sum,
                amount,
            } = global_benchmark;

            let key = name;
            let value = UpdateableGlobalBenchmark::InDatabase {
                id,
                was_modified: false,
                info: GlobalBenchmarkInfo { max, sum, amount },
            };

            (key, value)
        })
        .collect())
}

fn mapped_global_benchmarks(
    global_benchmarks: HashMap<String, UpdateableGlobalBenchmark>,
    global_benchmarks_id_by_name: &HashMap<String, i32>,
) -> MappedGlobalBenchmarks {
    global_benchmarks
        .into_iter()
        .map(|(global_benchmark_name, global_benchmark)| {
            let info = match global_benchmark {
                UpdateableGlobalBenchmark::InDatabase { info, .. } => info,
                UpdateableGlobalBenchmark::NotIntDatabase(info) => info,
            };
            (global_benchmarks_id_by_name[&global_benchmark_name], info)
        })
        .collect()
}

fn update_global_benchmarks(
    laptops: &LaptopInfosByName,
    global_benchmarks: &mut HashMap<String, UpdateableGlobalBenchmark>,
) {
    /// updates the info of the global benchmarks according to each of given the benchmarks
    /// the prefix is used to specify the pu type of the benchmarks, since we are not using
    /// 2 different tables, one for each pu type, and instead the first character of the benchmark's
    /// name specifies its pu type.
    fn update_info_according_to_benchmarks(
        benchmarks: &LaptopPuBenchmarksData,
        global_benchmarks: &mut HashMap<String, UpdateableGlobalBenchmark>,
        prefix: char,
    ) {
        for (benchmark_name, &score) in benchmarks {
            let global_benchmark_name = format!("{}{}", prefix, benchmark_name);
            // find the entry or insert a new one if it does not exist, and update it with the benchmark's average score
            global_benchmarks
                .entry(global_benchmark_name)
                .or_insert_with(UpdateableGlobalBenchmark::new_not_in_database)
                .update(score);
        }
    }

    for laptop_info in laptops.values() {
        update_info_according_to_benchmarks(&laptop_info.cpu_bench, global_benchmarks, 'c');
        update_info_according_to_benchmarks(&laptop_info.gpu_bench, global_benchmarks, 'g');
    }
}

/// upserts the updated global benchmarks into the database.
/// returns a map that maps each global benchmark's name to its id.
fn upsert_updated_global_benchmarks(
    db_connection: &PgConnection,
    global_benchmarks: &HashMap<String, UpdateableGlobalBenchmark>,
) -> Result<HashMap<String, i32>> {
    // find the new global benchmarks and convert them to insertable structs
    let mut new_global_benchmarks = Vec::new();
    for (global_benchmark_name, global_benchmark) in global_benchmarks {
        if let UpdateableGlobalBenchmark::NotIntDatabase(info) = global_benchmark {
            let GlobalBenchmarkInfo { max, sum, amount } = info;
            new_global_benchmarks.push(models::NewGlobalBenchmark {
                name: &global_benchmark_name,
                max: *max,
                sum,
                amount: *amount,
            })
        }
    }

    // insert the new global benchmarks
    let new_global_benchmarks_names_and_ids: Vec<(String, i32)> = {
        use schema::global_benchmark;

        diesel::insert_into(global_benchmark::table)
            .values(&new_global_benchmarks)
            .on_conflict(global_benchmark::name)
            .do_update()
            .set((
                global_benchmark::max.eq(excluded(global_benchmark::max)),
                global_benchmark::sum.eq(excluded(global_benchmark::sum)),
                global_benchmark::amount.eq(excluded(global_benchmark::amount)),
            ))
            .returning((global_benchmark::name, global_benchmark::id))
            .get_results(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?
    };

    // create a map that maps every global benchmark's name to its id.
    let mut global_benchmarks_id_by_name: HashMap<String, i32> =
        new_global_benchmarks_names_and_ids.into_iter().collect();
    global_benchmarks_id_by_name.extend(global_benchmarks.into_iter().filter_map(
        |(global_benchmark_name, global_benchmark)| match global_benchmark {
            UpdateableGlobalBenchmark::InDatabase { id, .. } => {
                Some((global_benchmark_name.clone(), *id))
            }
            UpdateableGlobalBenchmark::NotIntDatabase(_) => None,
        },
    ));

    Ok(global_benchmarks_id_by_name)
}

/// upserts each laptops in the laptops file and its corresponding benchmarks into the database.
/// while iterating through the laptops also finds the laptops price limits, and maps the benchmarks
/// to avoid iterating over the laptops twice, which improves performance.
fn upsert_laptops_benchmarks_and_image_urls(
    laptops: &LaptopInfosByName,
    global_benchmarks_id_by_name: &HashMap<String, i32>,
    db_connection: &PgConnection,
) -> Result<(PriceLimits, MappedBenchmarks)> {
    use schema::benchmark;
    use schema::laptop;
    use schema::laptop_image;

    let mut price_limits = PriceLimits::new();
    let mut mapped_benchmarks = MappedBenchmarks::new();

    for (laptop_name, laptop_info) in laptops {
        // update the price limits according to the laptop's price
        price_limits.update(laptop_info.price);

        // insert the laptop and get the laptop's id
        let inserted_laptop_id: i32 = diesel::insert_into(laptop::table)
            .values(models::NewLaptop {
                name: laptop_name,
                url: &laptop_info.url,
                price: laptop_info.price,
                cpu: &laptop_info.cpu,
                gpu: &laptop_info.gpu,
            })
            .returning(laptop::id)
            .on_conflict(laptop::name)
            .do_update()
            .set((
                laptop::url.eq(&laptop_info.url),
                laptop::price.eq(laptop_info.price),
                laptop::cpu.eq(&laptop_info.cpu),
                laptop::gpu.eq(&laptop_info.gpu),
            ))
            .get_result(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

        // convert all benchmarks into a vector of insertable benchmark structs
        // so that we can insert them to the database
        let mut new_benchmarks = Vec::new();
        convert_benchmarks_to_insertable_structs(
            &laptop_info.cpu_bench,
            &mut new_benchmarks,
            'c',
            inserted_laptop_id,
            global_benchmarks_id_by_name,
        );
        convert_benchmarks_to_insertable_structs(
            &laptop_info.gpu_bench,
            &mut new_benchmarks,
            'g',
            inserted_laptop_id,
            global_benchmarks_id_by_name,
        );

        // insert the benchmarks into the database
        diesel::insert_into(benchmark::table)
            .values(new_benchmarks.as_slice())
            .execute(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

        let new_image_urls =
            convert_image_urls_to_insertable_structs(laptop_info, inserted_laptop_id);
        diesel::insert_into(laptop_image::table)
            .values(new_image_urls.as_slice())
            .execute(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

        // update the mapped benchmarks
        mapped_benchmarks.insert(
            inserted_laptop_id,
            new_benchmarks
                .into_iter()
                .map(|new_benchmark| (new_benchmark.global_benchmark_id, new_benchmark.score))
                .collect(),
        );
    }
    Ok((price_limits, mapped_benchmarks))
}
