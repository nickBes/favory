use crate::errors::*;
use crate::models;
use bigdecimal::BigDecimal;
use bigdecimal::Zero;
use diesel::prelude::*;

use diesel::PgConnection;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::OpenOptions;

const LAPTOPS_FILE_PATH: &str = "laptops.json";

/// the laptops file is just an array of laptop informations
type LaptopsFile = Vec<LaptopInformation>;

#[derive(Debug, Deserialize)]
struct LaptopInformation {
    name: String,
    cpu: String,
    cpu_data: LaptopPuData,
    gpu: Gpu,
    gpu_data: LaptopPuData,
}

#[derive(Debug, Deserialize)]
struct Gpu {
    model: String,
}
/// the data of the cpu or gpu in a laptop object from the laptops.json file
#[derive(Debug, Deserialize)]
struct LaptopPuData {
    bench: LaptopPuBenchmarksData,
}

/// the benchmarks of the cpu or gpu in a laptop object from the laptops.json file,
/// mapped using each benchmark's name
type LaptopPuBenchmarksData = HashMap<String, BenchmarkResults>;

#[derive(Debug, Deserialize)]
struct BenchmarkResults {
    avg: f32,
}

// the info about each global benchmark info. The name is not included here
// since this struct is stored in a hashmap that maps each global benchmark's name
// to this struct which contains its info.
struct GlobalBenchmarkInfo {
    max: f32,
    sum: BigDecimal,
    amount: i64,
}
impl GlobalBenchmarkInfo {
    fn new() -> Self {
        Self {
            max: 0.0,
            sum: BigDecimal::zero(),
            amount: 0,
        }
    }

    // updates the global benchmark info according to a single benchmark score
    fn update(&mut self, score: f32) {
        self.sum += BigDecimal::from(score);
        self.amount += 1;
        if score > self.max {
            self.max = score;
        }
    }
}

/// loads the laptops to the database and performs all required calculations
pub fn load_laptops(db_connection: &PgConnection) -> Result<()> {
    println!("deleting categories and dependents...");
    // the categories and the benchmark scores in categories are not up to date anymore
    // with the new benchmarks, so we should delete them, and to delete them 
    // we must also delete their dependents.
    super::delete_categories_and_dependents(db_connection)?;

    println!("deleting laptops, benchmarks and global benchmarks...");
    // delete all laptops, benchmarks and global benchmarks from the database,
    // so that we don't have duplicates. note that no update mechanism is used here
    // even though it could increase performance, because the data-processor currently
    // only needs to run once, and performs no recalculations.
    delete_laptops_and_benchmarks_and_global_benchmarks(db_connection)?;

    println!("loading the laptops file...");
    let laptops_file = parse_laptops_file()?;

    println!("calculating global benchmarks...");
    // calculate the global benchmarks
    let global_benchmark_infos = calculate_global_benchmarks(&laptops_file);

    // insert the global benchmarks, and map them, so we can get each global benchmark's id
    // using its name
    println!("inserting and mapping global benchmarks...");
    let global_benchmarks_id_by_name =
        insert_and_map_global_benchmarks(global_benchmark_infos, db_connection)?;
    println!("inserted {} global benchmarks", global_benchmarks_id_by_name.len());

    println!("inserting laptops and benchmarks...");
    // insert the laptops and benchmarks
    insert_laptops_and_benchmarks(&laptops_file, &global_benchmarks_id_by_name, db_connection)?;

    println!("successfully loaded laptops");
    Ok(())
}

/// deletes all laptops, benchmarks and global benchmarks from the database
fn delete_laptops_and_benchmarks_and_global_benchmarks(
    db_connection: &PgConnection,
) -> Result<()> {
    use crate::schema::benchmark;
    use crate::schema::global_benchmark;
    use crate::schema::laptop;

    diesel::delete(benchmark::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    diesel::delete(laptop::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    diesel::delete(global_benchmark::table)
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;
    Ok(())
}

/// inserts each laptops in the laptops file and its corresponding benchmarks
/// into the database.
fn insert_laptops_and_benchmarks(
    laptops_file: &[LaptopInformation],
    global_benchmarks_id_by_name: &HashMap<String, i32>,
    db_connection: &PgConnection,
) -> Result<()> {
    use crate::schema::benchmark;
    use crate::schema::laptop;

    /// converts the given benchmarks to the insertable benchmark struct NewBenchmark,
    /// and inserts them into the insertable_structs vector.
    /// the prefix is used to specify the pu type of the benchmarks, since we are not using
    /// 2 different tables, one for each pu type, and instead the first character of the benchmark's
    /// name specifies its pu type.
    fn convert_benchmarks_to_insertable_structs(
        benchmarks: &LaptopPuBenchmarksData,
        insertable_structs: &mut Vec<models::NewBenchmark>,
        prefix: char,
        laptop_id: i32,
        global_benchmarks_id_by_name: &HashMap<String, i32>,
    ) {
        for (benchmark_name, benchmark_results) in benchmarks {
            let global_benchmark_name = format!("{}{}", prefix, benchmark_name);
            insertable_structs.push(models::NewBenchmark {
                laptop_id,
                // it is safe to unwrap here because the global benchmarks were calculated according to these benchmarks,
                // so each benchmarks must have a global benchmark.
                global_benchmark_id: *global_benchmarks_id_by_name
                    .get(&global_benchmark_name)
                    .unwrap(),
                score: benchmark_results.avg,
            });
        }
    }

    for laptop_info in laptops_file {
        // insert the laptop and get the laptop's id
        let inserted_laptop_id: i32 = diesel::insert_into(laptop::table)
            .values(models::NewLaptop {
                name: &laptop_info.name,
                cpu: &laptop_info.cpu,
                gpu: &laptop_info.gpu.model,
            })
            .returning(laptop::id)
            .get_result(db_connection)
            .into_data_processor_result(DataProcessorErrorKind::DatabaseError)?;

        // convert all benchmarks into a vector of insertable benchmark structs
        // so that we can insert them to the database
        let mut new_benchmarks = Vec::new();
        convert_benchmarks_to_insertable_structs(
            &laptop_info.cpu_data.bench,
            &mut new_benchmarks,
            'c',
            inserted_laptop_id,
            global_benchmarks_id_by_name,
        );
        convert_benchmarks_to_insertable_structs(
            &laptop_info.gpu_data.bench,
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
    }
    Ok(())
}

/// calculates the information about each global benchmark according to the benchmarks in the laptops file.
/// this is used to avoid executing a lot of update queries when inserting the benchmarks, to update the global
/// benchmarks each time, and instead it precalculates them and inserts them in only a single query. Thus, there
/// is no need to update the global benchmarks when inserting the benchmarks, and the whole process of calculating
/// the global benchmarks was redurced to a single query.
fn calculate_global_benchmarks(
    laptops_file: &[LaptopInformation],
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
        for (benchmark_name, benchmark_results) in benchmarks {
            let global_benchmark_name = format!("{}{}", prefix, benchmark_name);
            // find the entry or insert a new one if it does not exist, and update it with the benchmark's average score
            info_by_name
                .entry(global_benchmark_name)
                .or_insert_with(GlobalBenchmarkInfo::new)
                .update(benchmark_results.avg);
        }
    }

    let mut info_by_name = HashMap::new();
    for laptop_info in laptops_file {
        update_info_according_to_benchmarks(&laptop_info.cpu_data.bench, &mut info_by_name, 'c');
        update_info_according_to_benchmarks(&laptop_info.gpu_data.bench, &mut info_by_name, 'g');
    }

    info_by_name
}

/// inserts the global benchmarks (calculated using the calculate_global_benchmarks function) into the database
/// and inserts them into a hashmap that maps each global benchmark's name to its id in the database.
fn insert_and_map_global_benchmarks(
    infos: HashMap<String, GlobalBenchmarkInfo>,
    db_connection: &PgConnection,
) -> Result<HashMap<String, i32>> {
    use crate::schema::global_benchmark;
    use crate::schema::global_benchmark::*;

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

fn parse_laptops_file() -> Result<LaptopsFile> {
    let laptops_file = OpenOptions::new()
        .read(true)
        .open(LAPTOPS_FILE_PATH)
        .into_data_processor_result(DataProcessorErrorKind::FailedToOpenLaptopsFile)?;
    serde_json::de::from_reader(laptops_file)
        .into_data_processor_result(DataProcessorErrorKind::FailedToDeserializeLaptopsFile)
}
