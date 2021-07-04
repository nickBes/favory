table! {
    benchmark (id) {
        id -> Int8,
        score -> Float4,
        laptop -> Nullable<Int4>,
    }
}

table! {
    benchmark_score_in_category (id) {
        id -> Int4,
        score -> Float4,
        category -> Nullable<Int4>,
        global_benchmark -> Nullable<Int4>,
    }
}

table! {
    category (id) {
        id -> Int4,
        name -> Nullable<Text>,
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
        cpu -> Text,
        gpu -> Text,
    }
}

joinable!(benchmark -> laptop (laptop));
joinable!(benchmark_score_in_category -> category (category));
joinable!(benchmark_score_in_category -> global_benchmark (global_benchmark));

allow_tables_to_appear_in_same_query!(
    benchmark,
    benchmark_score_in_category,
    category,
    global_benchmark,
    laptop,
);
