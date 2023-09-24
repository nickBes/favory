// @generated automatically by Diesel CLI.

diesel::table! {
    benchmark (id) {
        id -> Int8,
        score -> Float4,
        laptop_id -> Int4,
        global_benchmark_id -> Int4,
    }
}

diesel::table! {
    benchmark_score_in_category (id) {
        id -> Int4,
        score -> Float4,
        category_id -> Int4,
        global_benchmark_id -> Int4,
    }
}

diesel::table! {
    category (id) {
        id -> Int4,
        name -> Text,
    }
}

diesel::table! {
    global_benchmark (id) {
        id -> Int4,
        name -> Text,
        max -> Float4,
        sum -> Numeric,
        amount -> Int8,
    }
}

diesel::table! {
    laptop (id) {
        id -> Int4,
        name -> Text,
        url -> Text,
        price -> Float4,
        cpu -> Text,
        gpu -> Text,
    }
}

diesel::table! {
    laptop_image (id) {
        id -> Int4,
        laptop_id -> Int4,
        image_url -> Text,
    }
}

diesel::table! {
    laptop_score_in_category (id) {
        id -> Int4,
        score -> Float4,
        laptop_id -> Int4,
        category_id -> Int4,
    }
}

diesel::table! {
    laptop_specs (id) {
        id -> Int4,
        laptop_id -> Int4,
        ram_gigabytes -> Int4,
        weight_grams -> Float4,
    }
}

diesel::table! {
    price_limits (id) {
        id -> Int4,
        max_price -> Float4,
        min_price -> Float4,
    }
}

diesel::joinable!(benchmark -> global_benchmark (global_benchmark_id));
diesel::joinable!(benchmark -> laptop (laptop_id));
diesel::joinable!(benchmark_score_in_category -> category (category_id));
diesel::joinable!(benchmark_score_in_category -> global_benchmark (global_benchmark_id));
diesel::joinable!(laptop_image -> laptop (laptop_id));
diesel::joinable!(laptop_score_in_category -> category (category_id));
diesel::joinable!(laptop_score_in_category -> laptop (laptop_id));
diesel::joinable!(laptop_specs -> laptop (laptop_id));

diesel::allow_tables_to_appear_in_same_query!(
    benchmark,
    benchmark_score_in_category,
    category,
    global_benchmark,
    laptop,
    laptop_image,
    laptop_score_in_category,
    laptop_specs,
    price_limits,
);
