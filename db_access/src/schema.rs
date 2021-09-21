table! {
    benchmark (id) {
        id -> Int8,
        score -> Float4,
        laptop_id -> Int4,
        global_benchmark_id -> Int4,
    }
}

table! {
    benchmark_score_in_category (id) {
        id -> Int4,
        score -> Float4,
        category_id -> Int4,
        global_benchmark_id -> Int4,
    }
}

table! {
    category (id) {
        id -> Int4,
        name -> Text,
    }
}

table! {
    global_benchmark (id) {
        id -> Int4,
        name -> Text,
        max -> Float4,
        sum -> Numeric,
        amount -> Int8,
    }
}

table! {
    laptop (id) {
        id -> Int4,
        name -> Text,
        price -> Float4,
        cpu -> Text,
        gpu -> Text,
    }
}

table! {
    laptop_image (id) {
        id -> Int4,
        laptop_id -> Int4,
        image_url -> Text,
    }
}

table! {
    laptop_score_in_category (id) {
        id -> Int4,
        score -> Float4,
        laptop_id -> Int4,
        category_id -> Int4,
    }
}

table! {
    price_limits (id) {
        id -> Int4,
        max_price -> Float4,
        min_price -> Float4,
    }
}

joinable!(benchmark -> global_benchmark (global_benchmark_id));
joinable!(benchmark -> laptop (laptop_id));
joinable!(benchmark_score_in_category -> category (category_id));
joinable!(benchmark_score_in_category -> global_benchmark (global_benchmark_id));
joinable!(laptop_image -> laptop (laptop_id));
joinable!(laptop_score_in_category -> category (category_id));
joinable!(laptop_score_in_category -> laptop (laptop_id));

allow_tables_to_appear_in_same_query!(
    benchmark,
    benchmark_score_in_category,
    category,
    global_benchmark,
    laptop,
    laptop_image,
    laptop_score_in_category,
    price_limits,
);
