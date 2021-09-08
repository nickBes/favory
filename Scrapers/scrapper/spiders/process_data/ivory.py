from spiders.process_data.map_setup.store_map import StoreMap
from spiders.process_data.device_id_detector import detect_cpu_id, detect_gpu_id, is_integrated_gpu

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

    # detecting device's ids that are relevant to notebookcheck
    # there might be a better way of accessing these parameters
    # using map functionalities, but for now it'll do the work
    if laptop_dict.get('gpu') != None and laptop_dict.get('cpu') != None:
        gpu_id = detect_gpu_id(laptop_dict['gpu'], laptop_dict['cpu'])
        laptop_dict['gpu'] = gpu_id
        laptop_dict['integrated'] = is_integrated_gpu(gpu_id)
        laptop_dict['cpu'] = detect_cpu_id(laptop_dict['cpu'])
    return laptop_dict

def get_table_key(key):
    return ivory_map.lables_map.get(key)