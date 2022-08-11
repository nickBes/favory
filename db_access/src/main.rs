use db_access::TablesMigration;
use gorm::migration_cli_main;

#[tokio::main]
async fn main() {
    migration_cli_main(TablesMigration, "postgres://postgres:postgres@localhost/favory").await
}
