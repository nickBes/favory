import scrapy
from spiders.notebookcheck import NotebookCheckSpider
from spiders.process_data.ivory import get_laptop_dict_from_response

PAGE_URL = 'https://www.ivory.co.il/catalog.php?act=cat&id=2590&pg=%s'
PAGE_AMOUNT = 4
ITEM_URL = 'https://www.ivory.co.il/catalog.php?id=%s'
ITEM_AMOUNT = -1

class IvorySpider(NotebookCheckSpider):
    name = 'ivory'

    custom_settings = {
        'FEEDS': {
            'ivory-laptops.json': {'format': 'json'}
        },
        'DUPEFILTER_DEBUG': True,
        'DUPEFILTER_CLASS': 'scrapy.dupefilters.BaseDupeFilter'
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        page_urls = [(PAGE_URL%page_index) for page_index in range(PAGE_AMOUNT)]

        # get the first url
        url = page_urls.pop()
        yield scrapy.Request(url=url,
                            callback=self.collect_pages,
                            meta={'page_urls':page_urls, 'laptop_ids': []})

    def collect_pages(self, response):
        '''
        Recursive collection of pages
        '''
        page_urls = response.meta['page_urls']
        laptop_ids = response.meta['laptop_ids']

        laptop_ids_cur_page = response.css('a::attr(data-product-id)').getall()

        # Limiting the amount of laptops (-1 means no limit)
        if ITEM_AMOUNT!=-1:
            laptop_ids_cur_page = laptop_ids_cur_page[:ITEM_AMOUNT]

        # add the laptop urls from the current page
        laptop_ids.extend(laptop_ids_cur_page)

        if len(page_urls) == 0:
            # if we finished collecting the pages, start collecting the laptops
            # get the first laptop id
            laptop_id = laptop_ids.pop()
            yield scrapy.Request(url=ITEM_URL%laptop_id,
                                callback=self.parse_laptops, meta={
                                    'laptop_ids': laptop_ids,
                                })
        else:
            url = page_urls.pop()
            yield response.follow(url=url,callback=self.collect_pages,
                                meta={
                                    'page_urls': page_urls,
                                    'laptop_ids': laptop_ids,
                                })

    # collecting laptop data from each laptop page   
    def parse_laptops(self, response):
        '''
        Recursive collection of laptop data
        '''
        laptop_ids = response.meta['laptop_ids']

        laptop_data = get_laptop_dict_from_response(response)
        # get_laptop_dict_from_response returns none if response throws errors
        if laptop_data != None:
            self.laptops.append(laptop_data)
        else:
            print(f"\nWARNING: Ivory spider failed on parsing this laptop: {response.url}\n")

        if len(laptop_ids) == 0:
            yield self.with_benchmarks()
        else:
            last_id = laptop_ids.pop()
            yield response.follow(url=ITEM_URL%last_id, callback=self.parse_laptops,
                                meta={
                                    'laptop_ids': laptop_ids,
                                })
