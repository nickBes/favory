import scrapy
from spiders.notebookcheck import NotebookCheckSpider
from spiders.process_data.device_id_detector import detect_pu_ids_in_laptop_data
from bs4 import BeautifulSoup

PAGE_AMOUNT = 1
ITEM_AMOUNT = 7

LABELS_MAP = {
        'מעבד': 'cpu',
        'סוג מעבד': 'cpu',
        'כרטיס גרפי': 'gpu',
        'כרטיס מסך': 'gpu',
        'גרפיקה': 'gpu',
        }

def create_page_url(page_index:int)->str:
    return 'https://www.lastprice.co.il/MoreProducts.asp?offset=%s&catcode=85'%page_index

class LastPriceSpider(NotebookCheckSpider):
    name = 'lastprice'

    custom_settings = {
        'FEEDS': {
            'laptops.json': {'format': 'json'}
        },
        'DUPEFILTER_DEBUG': True
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        for page_index in range(PAGE_AMOUNT):
            yield scrapy.Request(url=create_page_url(page_index),
                                callback=self.parse_page)


    # Collecting laptop urls from each page
    def parse_page(self, response):
        laptop_urls = response.css('a.prodLink::attr(href)').getall()

        # Limiting the laptops url amount and picking the first url,
        laptop_urls = laptop_urls[:ITEM_AMOUNT]
        url = laptop_urls.pop()
        yield scrapy.Request(url=url,
                            callback=self.parse_laptops, meta={
                                'laptop_urls': laptop_urls,
                            })

    def extract_laptop_description(self, response)->str:
        pass

    def extract_laptop_key_value_data(self, response)->dict:
        '''
        Extracts key-value data from the laptop's page, according to the keys in the `LABELS_MAP` map
        '''
        laptop_data = {}
        bs = BeautifulSoup(response.body, "html5lib")
        paragraphs = bs.select('#descr > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p')
        for paragraph in paragraphs:
            text = paragraph.get_text().strip()
            for line in text.splitlines():
                line = line.strip()
                parts = line.split(':')

                # only take paragraphs with key value structure
                if len(parts) != 2:
                    continue

                key,value = parts

                value = value.strip()
                key = key.strip()

                # if the key has not value, skip it
                if len(value) == 0:
                    continue

                if key in LABELS_MAP:
                    # map the key from its hebrew name to its english name
                    mapped_key = LABELS_MAP[key]
                    laptop_data[mapped_key] = value

        return laptop_data


    def extract_laptop_data(self, response)->dict:
        '''
        Extracts a dictionary of laptop data from the laptop's page
        '''

        laptop_data = self.extract_laptop_key_value_data(response)


        # additional fields that are not in key value pairs

        brand_url = response.css('a.h4::attr(href)').get()
        laptop_data['brand'] = brand_url.split('/')[-1]

        laptop_data['model'] = response.css('span.h4::text').get()

        laptop_data['name'] = response.css('#descr > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p:nth-child(1) > strong:nth-child(1)::text').get()

        return laptop_data

    # collecting laptop data from each laptop page   
    def parse_laptops(self, response):
        '''
        Recursive collection of laptop data
        '''

        laptop_urls = response.meta['laptop_urls']

        laptop_data = self.extract_laptop_data(response)
        detect_pu_ids_in_laptop_data(laptop_data)
        self.laptops.append(laptop_data)

        if len(laptop_urls) == 0:
            yield self.with_benchmarks()
        else:
            url = laptop_urls.pop()
            yield response.follow(url=url, callback=self.parse_laptops,
                                meta={
                                    'laptop_urls': laptop_urls,
                                })

