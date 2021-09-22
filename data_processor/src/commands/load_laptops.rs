use crate::errors::*;
use bigdecimal::BigDecimal;
use bigdecimal::Zero;
use db_access::models::NewLaptopImage;
use db_access::{models, schema};
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
    price: f32,
    cpu: String,
    cpu_bench: LaptopPuBenchmarksData,
    gpu: String,
    gpu_bench: LaptopPuBenchmarksData,
    image_urls: Vec<String>,
}

/// the benchmarks of the cpu or gpu in a laptop object from the laptops.json file,
/// mapped using each benchmark's name
type LaptopPuBenchmarksData = HashMap<String, f32>;

// the info about each global benchmark info. The name is not included here
// since this struct is stored in a hashmap that maps each global benchmark's name
// to this struct which contains its info.
#[derive(Debug)]
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

/// the minimum and maximum laptop price
#[derive(Debug)]
struct PriceLimits {
    max: Option<f32>,
    min: Option<f32>,
}
impl PriceLimits {
    pub fn new() -> Self {
        Self {
            max: None,
            min: None,
        }
    }
    /// updates the min and max fields according to the price if it is bigger than the current max
    /// or smaller than the current min.
    pub fn update(&mut self, price: f32) {
        // if we have no current max price just use the given price as the max,
        // otherwise check if the given price is bigger than max, and if it is,
        // update it accordingly
        match self.max {
            None => self.max = Some(price),
            Some(max_price) => {
                if price > max_price {
                    self.max = Some(price)
                }
            }
        }
        // if we have no current min price just use the given price as the min,
        // otherwise check if the given price is smaller than min, and if it is,
        // update it accordingly
        match self.min {
            None => self.min = Some(price),
            Some(min_price) => {
                if price < min_price {
                    self.min = Some(price)
                }
            }
        }
    }
    /// attempts to convert this PriceLimits struct to an insertable NewPriceLimits struct
    pub fn to_insertable(&self) -> Option<models::NewPriceLimits> {
        Some(models::NewPriceLimits {
            // note that the id is always 0 since we only want one such struct to exist in the
            // database at a time, and to use the ON CONFLICT statement to achieve upsert functionality,
            // the new document must have the same id as the previous one, so we just use a constant
            // value of 0 for the id.
            id: 0,
            max_price: self.max?,
            min_price: self.min?,
        })
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
    println!(
        "inserted {} global benchmarks",
        global_benchmarks_id_by_name.len()
    );

    println!("inserting laptops, benchmarks and image urls...");
    // insert the laptops and benchmarks
    let price_limits =
        insert_laptops_benchmarks_and_image_urls(&laptops_file, &global_benchmarks_id_by_name, db_connection)?;

    println!("inserting price limits...");
    insert_price_limits(&price_limits, db_connection)?;

    println!("successfully loaded laptops");
    Ok(())
}

/// deletes all laptops, benchmarks and global benchmarks from the database
fn delete_laptops_and_benchmarks_and_global_benchmarks(db_connection: &PgConnection) -> Result<()> {
    use schema::benchmark;
    use schema::global_benchmark;
    use schema::laptop;

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
/// into the database. while iterating through the laptops also finds the laptops price limits,
/// to avoid iterating over the laptops twice, which improves performance.
fn insert_laptops_benchmarks_and_image_urls(
    laptops_file: &[LaptopInformation],
    global_benchmarks_id_by_name: &HashMap<String, i32>,
    db_connection: &PgConnection,
) -> Result<PriceLimits> {
    use schema::benchmark;
    use schema::laptop_image;
    use schema::laptop;

    /// returns a list of insertable laptop images from the laptop
    fn convert_image_urls_to_insertable_structs(laptop: &LaptopInformation, id: i32) -> Vec<NewLaptopImage> {
        let mut laptop_images = Vec::new();
        for image_url in &laptop.image_urls{
            laptop_images.push(models::NewLaptopImage{
                laptop_id: id,
                image_url: &image_url,
            });
        }
        laptop_images
    }

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
        for (benchmark_name, &score) in benchmarks {
            let global_benchmark_name = format!("{}{}", prefix, benchmark_name);
            insertable_structs.push(models::NewBenchmark {
                laptop_id,
                // it is safe to unwrap here because the global benchmarks were calculated according to these benchmarks,
                // so each benchmarks must have a global benchmark.
                global_benchmark_id: *global_benchmarks_id_by_name
                    .get(&global_benchmark_name)
                    .unwrap(),
                score,
            });
        }
    }

    let mut price_limits = PriceLimits::new();

    for laptop_info in laptops_file {
        // update the price limits according to the laptop's price
        price_limits.update(laptop_info.price);

        // insert the laptop and get the laptop's id
        let inserted_laptop_id: i32 = diesel::insert_into(laptop::table)
            .values(models::NewLaptop {
                name: &laptop_info.name,
                price: laptop_info.price,
                cpu: &laptop_info.cpu,
                gpu: &laptop_info.gpu,
            })
            .returning(laptop::id)
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

        let new_image_urls = convert_image_urls_to_insertable_structs(laptop_info, inserted_laptop_id);
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
    for laptop_info in laptops_file {
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

fn parse_laptops_file() -> Result<LaptopsFile> {
    let laptops_file = OpenOptions::new()
        .read(true)
        .open(LAPTOPS_FILE_PATH)
        .into_data_processor_result(DataProcessorErrorKind::FailedToOpenLaptopsFile)?;
    serde_json::de::from_reader(laptops_file)
        .into_data_processor_result(DataProcessorErrorKind::FailedToDeserializeLaptopsFile)
}

/// saves the given price limits to the database, if it actually contains the price limits
/// (the min and max fields are not None)
fn insert_price_limits(price_limits: &PriceLimits, db_connection: &PgConnection) -> Result<()> {
    // notice the rename here to avoid conflicting with the argument called price_limits
    use schema::price_limits::dsl::{id, max_price, min_price, price_limits as price_limits_table};

    // in case we failed to convert the price limits to an insertable struct, it means that there is no max or min score,
    // which means that no laptops were inserted. this should never happen, but just in case it does, we should just not
    // save anything in the database, and return.
    let insertable_price_limits = match price_limits.to_insertable() {
        Some(v) => v,
        None => return Ok(()),
    };
    diesel::insert_into(price_limits_table)
        .values(&insertable_price_limits)
        // in case there is already a price limits document in the database, we just update the min and max prices
        .on_conflict(id)
        .do_update()
        .set((
            max_price.eq(insertable_price_limits.max_price),
            min_price.eq(insertable_price_limits.min_price),
        ))
        .execute(db_connection)
        .into_data_processor_result(DataProcessorErrorKind::FailedToDeserializeLaptopsFile)?;

    Ok(())
}
