import json
from pathlib import Path

# Organized class that includes the stores' relevant data 
# from the map.json
class StoreMap:
    def __init__(self, store):
        self.__MAP_PATH = Path(__file__).parent / 'map.json'

        if not self.__MAP_PATH.is_file():
            raise FileNotFoundError(f"{self.__MAP_PATH} doesn't exists, please create a map.json file as per the documentation.")

        with open(self.__MAP_PATH, 'r', encoding='utf-8') as unicode_map_file:
            store_map = json.load(unicode_map_file).get(store)
            self.table_map, self.lables_map, self.regex_map = store_map.get('table'), store_map.get('lables'), store_map.get('regex')