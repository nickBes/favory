# How to set up `map.json`:
## **First level**:
___
    
    {
        "store1": {...},
        "store2": {...}
        ...
    }

On the first level you should write a store name.

## **Second level**:
    
___
    {
        "store1": {
            "lables": {...},
            "table": {...},
            "regex": {...}
        }
        ...
    }

On the second level we're setting up 3 mandatory fields of each store:
1. `table`
2. `lables`
3. `regex`

They will be discussed on the next level.

## **Third level**:
___
## `table`:
Includes css selector fields to access the table and it's values.

    "table": {
        "css": "${tables' css selector as a list}",
        "lable_css": "${relative to the table css selctor for each lable}",
        "value_css": "${relative to the table css selctor for each value}"
    }
## `lables`:
Includes a mapping for each table lable that appears in each store to a standard one:

    "lables": {
        "מעבד": "cpu",
        "נפח": "capacity"
        ...
    }

## `regex`:
Includes a mapping of standard lables to regexes that filter the according value of each lable.

    "regex": {
        "cpu": "מעבד(.*?),",
        "resolution": "ברזולוציית([a-zA-Z]+)",
        ...
    }