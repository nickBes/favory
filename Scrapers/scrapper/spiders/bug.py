import scrapy
from spiders.notebookcheck import NotebookCheckSpider
from spiders.process_data.ivory import get_laptop_dict_from_response
from spiders.process_data.device_id_detector import detect_pu_ids_in_laptop_data
from spiders.process_data.regex import RAM_REGEX,WEIGHT_REGEX, PRICE_REGEX
from bs4 import BeautifulSoup

PAGE_AMOUNT = 10
ITEM_AMOUNT = -1

LABELS_MAP = {
        'מעבד': 'cpu',
        'מאיץ גרפי': 'gpu',
        'זכרון RAM': 'ram',
        'דגם': 'model',
        'משקל':'weight',
        }

def create_page_url(page_index:int)->str:
    return 'https://www.bug.co.il/laptops/?page=%s&promo_id=homepage_icons_menu&promo_name=laptops_icon_29_10&promo_creative=laptops_icon_29_11&promo_position=slot7'%(page_index+1)

def create_url_from_relative_url(relative_url: str)->str:
    return 'https://www.bug.co.il'+relative_url

def iterate_in_pairs(iterator):
    '''
    iterates over this iterator in pairs.
    for example given the iterator [1,2,3,4,5,6], the iterator that will be returned is [(1,2), (3,4), (5,6)]
    '''
    is_first_item_in_pair = True
    first_item_in_pair = None
    for item in iterator:
        if is_first_item_in_pair:
            first_item_in_pair = item
        else:
            yield (first_item_in_pair, item)

        is_first_item_in_pair = not is_first_item_in_pair


class BugSpider(NotebookCheckSpider):
    name = 'bug'

    custom_settings = {
        'FEEDS': {
            'bug-laptops.json': {'format': 'json'}
        },
        'DUPEFILTER_DEBUG': True,
        'DUPEFILTER_CLASS': 'scrapy.dupefilters.BaseDupeFilter'
    }

    # Request all of the pages use the parse callback
    def start_requests(self):
        page_urls = [create_page_url(page_index) for page_index in range(PAGE_AMOUNT)]

        # get the first url
        url = page_urls.pop()
        yield scrapy.Request(url=url,
                            callback=self.collect_pages,
                            meta={'page_urls':page_urls, 'laptop_urls': []})

    def collect_pages(self, response):
        '''
        Recursive collection of pages
        '''
        page_urls = response.meta['page_urls']
        laptop_urls = response.meta['laptop_urls']

        laptop_urls_cur_page = self.extract_laptop_urls_from_page(response)

        # Limiting the amount of laptops (-1 means no limit)
        if ITEM_AMOUNT!=-1:
            laptop_urls_cur_page = laptop_urls_cur_page[:ITEM_AMOUNT]

        # add the laptop urls from the current page
        laptop_urls.extend(laptop_urls_cur_page)

        if len(page_urls) == 0:
            # if we finished collecting the pages, start collecting the laptops
            # get the first url
            url = laptop_urls.pop()
            yield scrapy.Request(url=url,
                                callback=self.parse_laptops, meta={
                                    'laptop_urls': laptop_urls,
                                })
        else:
            url = page_urls.pop()
            yield response.follow(url=url,callback=self.collect_pages,
                                meta={
                                    'page_urls': page_urls,
                                    'laptop_urls': laptop_urls
                                })


    def extract_laptop_urls_from_page(self, response):
        '''
        extracts laptop urls from a laptops page
        '''
        laptop_relative_urls = response.css('div.product-cube > div:nth-child(1) > a:nth-child(2)::attr(href)').getall()

        # convert the relative urls to actual urls
        laptop_urls = [create_url_from_relative_url(relative_url) for relative_url in laptop_relative_urls]

        return laptop_urls

    def extract_laptop_images(self, response)->str:
        image_relative_urls = response.css('#image-gallery > li > img::attr(src)').getall()

        # convert the relative urls to actual urls
        return [create_url_from_relative_url(relative_url) for relative_url in image_relative_urls]


    def extract_laptop_data(self, response)->dict:
        '''
        Extracts a dictionary of laptop data from the laptop's page
        '''

        laptop_data = {}

        # not using beautifulsoup for the whole document for performance reasons, instead using it
        # just on the properties container
        # using find('div') because beautifulsoup appends html and body tags 
        # to the given html document if it doesn't have these tags.
        properties_container = BeautifulSoup(response.css('#product-properties-container').get(), 'html5lib').find('div')

        # the properties container contains multiple property lists, we should scrape
        # data from each of them
        for property_list in properties_container.children:
            for key_elem,value_elem in iterate_in_pairs(property_list.children):
                key = key_elem.text
                value = value_elem.text
                if key in LABELS_MAP:
                    # map the key from its hebrew name to its english name
                    mapped_key = LABELS_MAP[key]

                    # extract the weight float from the weight string
                    if mapped_key == 'weight':
                        value = float(WEIGHT_REGEX.findall(value)[0])
                    # extract the ram integer from the ram string
                    if mapped_key == 'ram':
                        ram_text = RAM_REGEX.findall(value)[0]

                        # remove the 'GB' string from the ram text
                        ram_text = ram_text[:-len('GB')]

                        value = int(ram_text)

                    laptop_data[mapped_key] = value

        # additional fields not in the properties container

        # brand
        laptop_data['brand'] = response.css('div.p-manufacturer a::text').get()

        # url
        laptop_data['url'] = response.url

        # image urls
        laptop_data['image_urls'] = self.extract_laptop_images(response)

        # price
        price_label = response.css('#product-price-container > ins:nth-child(1)::text').get()

        # extract the price text from the price label
        price_text = PRICE_REGEX.findall(price_label)[0]

        # remove the ',' from the price text
        price_text = price_text.replace(',','')

        laptop_data['price'] = float(price_text)


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


