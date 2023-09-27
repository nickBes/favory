use crate::controllers::laptop;
use actix_web::web;

pub fn register_laptop_routes(service_config: &mut web::ServiceConfig) {
    service_config.service(web::scope("/laptop").service(laptop::select));
}
