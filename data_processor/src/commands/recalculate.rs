use crate::commands::{GlobalBenchmarkInfo, upsert_price_limits};
use crate::commands::PriceLimits;
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
    let mut global_benchmarks = load_global_benchmarks(db_connection)?;
    update_global_benchmarks(&laptops, &mut global_benchmarks);
    let global_benchmarks_id_by_name =
        insert_updated_global_benchmarks(db_connection, global_benchmarks)?;
    let price_limits = upsert_laptops_benchmarks_and_image_urls(
        &laptops,
        &global_benchmarks_id_by_name,
        db_connection,
    )?;
    upsert_price_limits(&price_limits, db_connection)?;

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

/// loads the laptops to the database and performs all required calculations
fn load_laptops(db_connection: &PgConnection) -> Result<()> {
    println!("deleting categories and dependents...");
    // the categories and the benchmark scores in categories are not up to date anymore
    // with the new benchmarks, so we should delete them, and to delete them
    // we must also delete their dependents.
    super::delete_categories_and_dependents(db_connection)?;

    println!("loading the laptops file...");
    let laptops = parse_laptops_files(RECALCULATION_LAPTOPS_DIR_PATH)?;

    println!("calculating global benchmarks...");
    // calculate the global benchmarks
    let global_benchmark_infos = calculate_global_benchmarks(&laptops);

    // insert the global benchmarks, and map them, so we can get each global benchmark's id
    // using its name
    println!("inserting and mapping global benchmarks...");
    let global_benchmarks_id_by_name =
        insert_and_map_global_benchmarks(global_benchmark_infos, db_connection)?;
    println!(
        "inserted {} global benchmarks",
        global_benchmarks_id_by_name.len()
    );

    println!("inserting laptops, benchmarks and image urls...");
    // insert the laptops and benchmarks
    let price_limits = upsert_laptops_benchmarks_and_image_urls(
        &laptops,
        &global_benchmarks_id_by_name,
        db_connection,
    )?;
    println!("inserted {} laptops", laptops.len());

    println!("inserting price limits...");
    upsert_price_limits(&price_limits, db_connection)?;

    println!("successfully loaded laptops");
    Ok(())
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

fn insert_updated_global_benchmarks(
    db_connection: &PgConnection,
    global_benchmarks: HashMap<String, UpdateableGlobalBenchmark>,
) -> Result<HashMap<String, i32>> {
    // find the new global benchmarks and convert them to insertable structs
    let mut new_global_benchmarks = Vec::new();
    for (global_benchmark_name, global_benchmark) in &global_benchmarks {
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
            UpdateableGlobalBenchmark::InDatabase { id, .. } => Some((global_benchmark_name, id)),
            UpdateableGlobalBenchmark::NotIntDatabase(_) => None,
        },
    ));

    Ok(global_benchmarks_id_by_name)
}

/// upserts each laptops in the laptops file and its corresponding benchmarks
/// into the database. while iterating through the laptops also finds the laptops price limits,
/// to avoid iterating over the laptops twice, which improves performance.
fn upsert_laptops_benchmarks_and_image_urls(
    laptops: &LaptopInfosByName,
    global_benchmarks_id_by_name: &HashMap<String, i32>,
    db_connection: &PgConnection,
) -> Result<PriceLimits> {
    use schema::benchmark;
    use schema::laptop;
    use schema::laptop_image;

    let mut price_limits = PriceLimits::new();

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
    }
    Ok(price_limits)
}

/// calculates the information about each global benchmark according to the benchmarks in the laptops file.
/// this is used to avoid executing a lot of update queries when inserting the benchmarks, to update the global
/// benchmarks each time, and instead it precalculates them and inserts them in only a single query. Thus, there
/// is no need to update the global benchmarks when inserting the benchmarks, and the whole process of calculating
/// the global benchmarks was redurced to a single query.
fn calculate_global_benchmarks(
    laptops: &LaptopInfosByName,
) -> HashMap<String, GlobalBenchmarkInfo> {
    /// updates the info of the global benchmarks according to each of given the benchmarks
    /// the prefix is used to specify the pu type of the benchmarks, since we are not using
    /// 2 different tables, one for each pu type, and instead the first character of the benchmark's
    /// name specifies its pu type.
    fn update_info_according_to_benchmarks(
        benchmarks: &LaptopPuBenchmarksData,
        info_by_name: &mut HashMap<String, GlobalBenchmarkInfo>,
        prefix: char,
    ) {
        for (benchmark_name, &score) in benchmarks {
            let global_benchmark_name = format!("{}{}", prefix, benchmark_name);
            // find the entry or insert a new one if it does not exist, and update it with the benchmark's average score
            info_by_name
                .entry(global_benchmark_name)
                .or_insert_with(GlobalBenchmarkInfo::new)
                .update(score);
        }
    }

    let mut info_by_name = HashMap::new();
    for laptop_info in laptops.values() {
        update_info_according_to_benchmarks(&laptop_info.cpu_bench, &mut info_by_name, 'c');
        update_info_according_to_benchmarks(&laptop_info.gpu_bench, &mut info_by_name, 'g');
    }

    info_by_name
}

/// inserts the global benchmarks (calculated using the calculate_global_benchmarks function) into the database
/// and inserts them into a hashmap that maps each global benchmark's name to its id in the database.
fn insert_and_map_global_benchmarks(
    infos: HashMap<String, GlobalBenchmarkInfo>,
    db_connection: &PgConnection,
) -> Result<HashMap<String, i32>> {
    use schema::global_benchmark;
    use schema::global_benchmark::*;

    // first convert the global benchmarks to insertable structs
    let mut new_global_benchmarks = Vec::new();
    for (global_benchmark_name, global_benchmark_info) in &infos {
        new_global_benchmarks.push(models::NewGlobalBenchmark {
            name: &global_benchmark_name,
            max: global_benchmark_info.max,
            sum: &global_benchmark_info.sum,
            amount: global_benchmark_info.amount,
        });
    }

    // insert the global benchmarks to the database, and return each global benchmark's name and id so that we can map them
    let global_benchmarks_names_and_ids: Vec<(String, i32)> =
        diesel::insert_into(global_benchmark::table)
            .values(new_global_benchmarks.as_slice())
            .returning((name, id))
            .get_results(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

    let mut global_benchmarks_map = HashMap::new();
    for (global_benchmark_name, global_benchmark_id) in global_benchmarks_names_and_ids {
        global_benchmarks_map.insert(global_benchmark_name, global_benchmark_id);
    }
    Ok(global_benchmarks_map)
}

