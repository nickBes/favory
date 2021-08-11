import scrapy
from spiders.process_data.ivory import get_laptop_dict_from_response

IVORY_PAGE_URL = 'https://www.ivory.co.il/catalog.php?act=cat&id=2590&pg=%s'
IVORY_PAGE_AMOUNT = 1
IVORY_ITEM_URL = 'https://www.ivory.co.il/catalog.php?id=%s'
IVORY_ITEM_AMOUNT = 4

class IvorySpider(scrapy.Spider):
    name = 'ivory'

    custom_settings = {
        'FEEDS': {
            'laptops.json': {'format': 'json'}
        }
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        for pageNum in range(IVORY_PAGE_AMOUNT):
            yield scrapy.Request(url=IVORY_PAGE_URL%pageNum,
                                callback=self.parse_pages)


    # Collecting laptop id from each page
    def parse_pages(self, response):
        ids = response.css('a::attr(data-product-id)').getall()
        for num, val in enumerate(ids):
            if num == IVORY_ITEM_AMOUNT:
                break
            yield scrapy.Request(url=IVORY_ITEM_URL%val,
                                callback=self.parse_laptops)


    # collecting laptop data from each laptop page   
    def parse_laptops(self, response):
        yield get_laptop_dict_from_response(response)