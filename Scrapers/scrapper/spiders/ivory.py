import scrapy
from spiders.notebookcheck import NotebookCheckSpider
from spiders.process_data.ivory import get_laptop_dict_from_response

IVORY_PAGE_URL = 'https://www.ivory.co.il/catalog.php?act=cat&id=2590&pg=%s'
IVORY_PAGE_AMOUNT = 4
IVORY_ITEM_URL = 'https://www.ivory.co.il/catalog.php?id=%s'
IVORY_ITEM_AMOUNT = -1

class IvorySpider(NotebookCheckSpider):
    name = 'ivory'

    custom_settings = {
        'FEEDS': {
            'ivory-laptops.json': {'format': 'json'}
        },
        'DUPEFILTER_DEBUG': True
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        for pageNum in range(IVORY_PAGE_AMOUNT):
            yield scrapy.Request(url=IVORY_PAGE_URL%pageNum,
                                callback=self.parse_pages)


    # Collecting laptop id from each page
    def parse_pages(self, response):
        laptop_ids = response.css('a::attr(data-product-id)').getall()

        # Limiting the amount of laptops (-1 means no limit)
        if ITEM_AMOUNT!=-1:
            laptop_ids = laptop_ids[:ITEM_AMOUNT]

        # get the first id
        last_id = laptop_ids.pop()
        yield scrapy.Request(url=IVORY_ITEM_URL%last_id,
                            callback=self.parse_laptops, meta={
                                'laptop_ids': laptop_ids,
                            })


    # collecting laptop data from each laptop page   
    def parse_laptops(self, response):
        '''
        Recursive collection of laptop data
        '''
        laptop_ids = response.meta['laptop_ids']

        laptop_data = get_laptop_dict_from_response(response)
        self.laptops.append(laptop_data)

        if len(laptop_ids) == 0:
            yield self.with_benchmarks()
        else:
            last_id = laptop_ids.pop()
            yield response.follow(url=IVORY_ITEM_URL%last_id, callback=self.parse_laptops,
                                meta={
                                    'laptop_ids': laptop_ids,
                                })
