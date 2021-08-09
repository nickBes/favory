import scrapy

IVORY_PAGE_URL = 'https://www.ivory.co.il/catalog.php?act=cat&id=2590&pg=%s'
IVORY_PAGE_AMOUNT = 1
IVORY_ITEM_URL = 'https://www.ivory.co.il/catalog.php?id=%s'

class IvorySpider(scrapy.Spider):
    name = 'ivory'

    custom_settings = {
        
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        for pageNum in range(IVORY_PAGE_AMOUNT):
            yield scrapy.Request(url=IVORY_PAGE_URL%pageNum,
                                callback=self.parse_pages)


    # collecting laptop id from each page
    def parse_pages(self, response):
        ids = response.css('a::attr(data-product-id)').getall()
        for i in ids:
            yield scrapy.Request(url=IVORY_ITEM_URL%i,
                                callback=self.parse_laptops)


    # collecting laptop data from each laptop page   
    def parse_laptops(self, response):
        laptop_data = dict()
        rows = response.css('#panel2 > ul > div > li')
        for row in rows:
            key = row.css('div:nth-child(1) > b::text').get()
            value = row.css('div:nth-child(2)::text').get()
            laptop_data[key] = value

        yield laptop_data