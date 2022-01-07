from spiders.process_data.map_setup.store_map import StoreMap
from spiders.process_data.device_id_detector import detect_pu_ids_in_laptop_data
from spiders.process_data.regex import RAM_REGEX, WEIGHT_REGEX

# read the map data before being used
ivory_map = StoreMap('ivory')

# using the store map we're returning an organized
# dictionary that includes laptop's features from the response
def get_laptop_dict_from_response(response)->dict:
    laptop_dict = dict()
    # saving laptops ivory url
    laptop_dict['url'] = response.url
    # gets table and processes each row in it
    table = response.css(ivory_map.table_map.get('css'))
    for row in table:
        key = row.css(ivory_map.table_map.get('lable_css')).get()
        key = get_table_key(key)
        if key == None:
            continue
        value = row.css(ivory_map.table_map.get('value_css')).get()
        laptop_dict[key] = value

    # more accurate source for the price
    price_text = response.css('#pricetotalitemjs::attr(data-price)').get()
    
    # using try except because the price css might change when there are discounts,
    # and ram/weights might be missing from the table
    try:

        laptop_dict['price'] = float(price_text)

        # apply the ram regex to the ram string
        ram_text = RAM_REGEX.findall(laptop_dict['ram'])[0]

        # remove the 'GB' at the end
        ram_text = ram_text[:-len('GB')]
        laptop_dict['ram'] = int(ram_text)

        # apply the weight regex to the weight string
        weight_text = WEIGHT_REGEX.findall(laptop_dict['weight'])[0]
        laptop_dict['weight'] = float(weight_text)
    except:
        return None    

    # the `image_urls` field is required by the data processor, 
    # but the ivory spider doesn't support images scraping
    laptop_dict['image_urls'] = []

    detect_pu_ids_in_laptop_data(laptop_dict)

    return laptop_dict

def get_table_key(key):
    return ivory_map.lables_map.get(key)

