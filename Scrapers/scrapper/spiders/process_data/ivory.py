from spiders.process_data.map_setup.store_map import StoreMap

# read the map data before being used
ivory_map = StoreMap('ivory')

# using the store map we're returning an organized
# dictionary that includes laptop's features from the response
def get_laptop_dict_from_response(response):
    laptop_dict = dict()
    # gets table and processes each row in it
    table = response.css(ivory_map.table_map.get('css'))
    for row in table:
        key = row.css(ivory_map.table_map.get('lable_css')).get()
        key = get_table_key(key)
        if key == None:
            continue
        value = row.css(ivory_map.table_map.get('value_css')).get()
        laptop_dict[key] = value

    return laptop_dict


def get_table_key(key):
    return ivory_map.lables_map.get(key)