use bigdecimal::BigDecimal;

use crate::schema::*;

pub enum PuType{
    Cpu,
    Gpu,
}

#[derive(Debug, Queryable, Identifiable)]
#[table_name = "laptop"]
pub struct Laptop {
    pub id: i32,
    pub name: String,
    pub price: f32,
    pub cpu: String,
    pub gpu: String,
}


#[derive(Debug, Insertable)]
#[table_name="laptop"]
pub struct NewLaptop<'a, 'b, 'c> {
    pub name: &'a str,
    pub price: f32,
    pub cpu: &'b str,
    pub gpu: &'c str,
}

#[derive(Debug, Queryable, Identifiable)]
#[table_name = "global_benchmark"]
pub struct GlobalBenchmark{
    pub id: i32,
    pub name: String,
    pub max: f32,
    pub sum: BigDecimal,
    pub amount: i64,
}

impl GlobalBenchmark{
    pub fn pu_type(&self)-> PuType{
        if self.name.starts_with('c'){
            PuType::Cpu
        }else{
            PuType::Gpu
        }
    }
    pub fn name_without_prefix(&self) -> &str{
        &self.name[1..]
    }
}

#[derive(Debug, Insertable)]
#[table_name="global_benchmark"]
pub struct NewGlobalBenchmark<'a, 'b> {
    pub name: &'a str,
    pub max: f32,
    pub sum: &'b BigDecimal,
    pub amount: i64,
}

#[derive(Debug, Queryable, Identifiable)]
#[table_name = "category"]
pub struct Category{
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Insertable)]
#[table_name="category"]
pub struct NewCategory<'a> {
    pub name: &'a str,
}

#[derive(Debug, Queryable, Associations)]
#[belongs_to(Laptop)]
#[belongs_to(GlobalBenchmark)]
#[table_name = "benchmark"]
pub struct Benchmark{
    pub id: i64,
    pub score: f32,
    pub laptop_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Debug, Insertable)]
#[table_name="benchmark"]
pub struct NewBenchmark {
    pub score: f32,
    pub laptop_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Debug, Queryable, Associations)]
#[belongs_to(Category)]
#[belongs_to(GlobalBenchmark)]
#[table_name = "benchmark_score_in_category"]
pub struct BenchmarkScoreInCategory{
    pub id: i32,
    pub score: f32,
    pub category_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Debug, Insertable)]
#[table_name="benchmark_score_in_category"]
pub struct NewBenchmarkScoreInCategory {
    pub score: f32,
    pub category_id: i32,
    pub global_benchmark_id: i32,
}

#[derive(Debug, Queryable, Associations)]
#[belongs_to(Laptop)]
#[belongs_to(Category)]
#[table_name = "laptop_score_in_category"]
pub struct LaptopScoreInCategory{
    pub id: i32,
    pub score: f32,
    pub laptop_id: i32,
    pub category_id: i32,
}

#[derive(Debug, Insertable)]
#[table_name="laptop_score_in_category"]
pub struct NewLaptopScoreInCategory {
    pub score: f32,
    pub laptop_id: i32,
    pub category_id: i32,
}

#[derive(Debug, Queryable, Identifiable)]
#[table_name = "price_limits"]
pub struct PriceLimits {
    pub id: i32,
    pub max_price: f32,
    pub min_price: f32,
}

#[derive(Debug, Insertable)]
#[table_name = "price_limits"]
pub struct NewPriceLimits {
    pub id: i32,
    pub max_price: f32,
    pub min_price: f32,
}