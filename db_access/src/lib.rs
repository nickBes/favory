use gorm::{Table, SqlEnum, migration};

/// A laptop
#[derive(Debug, Table, Clone)]
pub struct Laptop {
    pub id: i32,

    #[table(unique)]
    pub name: String,

    #[table(unique)]
    pub url: String,

    pub price: f32,

    pub cpu: String,
    pub gpu: String,

    pub ram_gigabytes: i32,
    pub weight_grams: f32,
}

/// A property which has scores in some benchmarks
#[derive(Debug, Table, Clone)]
pub struct Property {
    pub id: i32,

    pub kind: PropertyKind,

    #[table(unique)]
    pub name: String,
}

/// A property of a laptop
#[derive(Debug, Table, Clone)]
pub struct PropertyOfLaptop {
    pub id: i32,

    #[table(foreign_key(Laptop))]
    pub laptop_id: i32,

    #[table(foreign_key(Property))]
    pub property_id: i32,
}

/// A benchmark of a property
#[derive(Debug, Table, Clone)]
#[table(unique(name, property_kind))]
pub struct PropertyBenchmark{
    pub id: i32,

    pub name: String,

    pub property_kind: PropertyKind,
}

/// The score of a property in some benchmark.
#[derive(Debug, Table, Clone)]
#[table(unique(property_id, benchmark_id))]
pub struct PropertyBenchmarkScore{
    pub id: i64,

    #[table(foreign_key(Property))]
    pub property_id: i32,

    #[table(foreign_key(PropertyBenchmark))]
    pub benchmark_id: i32,

    pub score: f32,
}

/// The kind of a property
#[derive(Debug, Clone, SqlEnum)]
pub enum PropertyKind{
    Cpu,
    Gpu,
    Ram,
    Weight,
}

/// A migration which manages all tables in the database
pub struct TablesMigration;

migration! { TablesMigration => laptop, property, property_of_laptop, property_benchmark, property_benchmark_score }
