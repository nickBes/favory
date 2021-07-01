use bigdecimal::BigDecimal;
use diesel::types::Decimal;

use crate::schema::*;

#[derive(Queryable, Identifiable)]
#[table_name = "laptop"]
pub struct Laptop {
    pub id: i32,
    pub cpu: String,
    pub gpu: String,
}


#[derive(Insertable)]
#[table_name="laptop"]
pub struct NewLaptop<'a, 'b> {
    pub cpu: &'a str,
    pub gpu: &'b str,
}

#[derive(Queryable, Identifiable)]
#[table_name = "global_benchmark"]
pub struct GlobalBenchmark{
    pub id: i32,
    pub max: f32,
    pub sum: BigDecimal,
    pub amount: i64,
    pub name: String,
}

#[derive(Insertable)]
#[table_name="global_benchmark"]
pub struct NewGlobalBenchmark<'a> {
    pub max: f32,
    pub sum: BigDecimal,
    pub amount: i64,
    pub name: &'a str,
}

#[derive(Queryable, Identifiable)]
#[table_name = "category"]
pub struct Category{
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[table_name="global_benchmark"]
pub struct NewCategory<'a> {
    pub name: &'a str,
}

#[derive(Queryable, Associations)]
#[belongs_to(Laptop)]
#[belongs_to(GlobalBenchmark)]
#[table_name = "benchmark"]
pub struct Benchmark{
    pub id: i32,
    pub score: f32,
    pub laptop_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Insertable)]
#[table_name="benchmark"]
pub struct NewBenchmark {
    pub score: f32,
    pub laptop_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Queryable, Associations)]
#[belongs_to(Category)]
#[belongs_to(GlobalBenchmark)]
#[table_name = "benchmark_score_in_category"]
pub struct BenchmarkScoreInCategory{
    pub id: i32,
    pub score: f32,
    pub category_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Insertable)]
#[table_name="benchmark_score_in_category"]
pub struct NewBenchmarkScoreInCategory {
    pub score: f32,
    pub category_id: i32,
    pub global_benchmark_id: i32,
}