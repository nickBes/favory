import scrapy
import re
from spiders.notebookcheck import NotebookCheckSpider
from spiders.process_data.device_id_detector import detect_pu_ids_in_laptop_data
from spiders.process_data.regex import PRICE_REGEX, RAM_REGEX, WEIGHT_REGEX, DEVICE_WORD_WITH_MISSING_SPACE_REGEX
from w3lib.html import remove_tags
from bs4 import BeautifulSoup

PAGE_AMOUNT = 1
ITEM_AMOUNT = -1

LABELS_MAP = {
        'מעבד': 'cpu',
        'סוג מעבד': 'cpu',
        'כרטיס גרפי': 'gpu',
        'כרטיס מסך': 'gpu',
        'גרפיקה': 'gpu',
        'מעבד גרפי': 'gpu',
        }

HEBREW_ALPHABET = 'קראטוןםפשדגכעיחלךףזסבהנמצתץ'

def create_page_url(page_index:int)->str:
    return 'https://www.lastprice.co.il/MoreProducts.asp?offset=%s&catcode=85'%page_index

def is_all_hebrew_letters(word:str)->bool:
    return all([c in HEBREW_ALPHABET for c in word])

class LastPriceSpider(NotebookCheckSpider):
    name = 'lastprice'

    custom_settings = {
        'FEEDS': {
            'lastprice-laptops.json': {'format': 'json'}
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

        laptop_urls_cur_page = response.css('a.prodLink::attr(href)').getall()

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

    def extract_laptop_images(self, response)->str:
        urls = []
        for thumbnail_url in response.css('img.ms-thumb::attr(src)').getall():
            # thumbnails have the same name as the images, but are in a directory called 180.
            # to get the actual image url, remove the '180' directory from the url
            image_url = thumbnail_url.replace('180/','')

            # the thumbnail url doesn't contain the 'http:' at the start, and starts with
            # '//www.lastprice.co.il' for some reason, so add back the 'https:' part
            image_url = 'https:' + image_url

            urls.append(image_url)
        return urls

    def extract_laptop_key_value_data(self, response)->dict:
        '''
        Extracts key-value data from the laptop's page, according to the keys in the `LABELS_MAP` map
        '''

        laptop_data = {}

        paragraphs = response.css('#descr > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > p').getall()
        for paragraph in paragraphs:
            text = remove_tags(paragraph).strip()
            lines = text.splitlines()
            for i in range(len(lines)):
                line = lines[i].strip()

                # convert annoying non braking spaces to normal spaces
                line = line.encode().replace(b"\xc2\xa0", b" ").decode()

                # the key is just all the first hebrew words in the line
                key = ''

                # either a delimiter with an optional space, or a space with
                # an optional delimiter
                for word in re.split('(?:[:-][  ]?)|(?:[:-]? )', line):
                    contained_separator = False

                    # if this word contains a key-value separator, remove it,
                    # and if it is also a hebrew word, then it must be the last
                    # word in the key, because after it comes the separator.
                    if ':' in word or '-' in word:
                        contained_separator = True

                        # remove the separator so we can check that the rest
                        # of the string is hebrew only
                        word = word.replace(':','').replace('-','')

                    if is_all_hebrew_letters(word):
                        key += word + ' '

                        # if the word contained a separator, it is the last
                        # word in the key.
                        if contained_separator:
                            break
                    else:
                        break

                # if the line contained no hebrew words, it is not a key-value
                # pair.
                if len(key)==0:
                    continue

                # the rest of the string represents the key's value
                value = line[len(key):]

                value = value.strip().replace('-',' ')
                key = key.strip()

                # if the key has not value, skip it
                if len(value) == 0:
                    continue

                if key in LABELS_MAP:
                    # map the key from its hebrew name to its english name
                    mapped_key = LABELS_MAP[key]

                    # special case for gpu, where lastprice decided to write the word 'GPU'
                    # as the value, and write the actual gpu on the next line
                    if mapped_key == 'gpu' and value == 'GPU':
                        value = lines[i+1].strip()

                    # special case for missing spaces in the value, becuase notebookcheck expects 
                    # spaces between words.
                    for device_word_with_missing_space in DEVICE_WORD_WITH_MISSING_SPACE_REGEX.findall(value):
                        # a missing space is detected by finding a word that has a digit right after it,
                        # with no space
                        word,digit_after_word = device_word_with_missing_space
                        value = value.replace(word+digit_after_word,word+' '+digit_after_word)

                    laptop_data[mapped_key] = value
                elif 'זיכרון' in key or 'זכרון' in key and not 'מקסימלי' in key:
                    # the lasprice website uses many labels for representing the amount of ram
                    # so to find the right one we just check if it contains the word 'זיכרון' or its variant,
                    # does not contain the word 'מקסימלי', and contains the regex of the ram.
                    ram_matches = RAM_REGEX.findall(value)
                    if len(ram_matches) > 0:
                        ram_text = ram_matches[0]

                        # remove the 'GB' at the end
                        ram_text = ram_text[:-len('GB')]

                        laptop_data['ram'] = int(ram_text)
                elif 'משקל' in key:
                    # the lasprice website uses many labels for representing the weight of a laptop
                    # so to find the right one we just check if it contains the word 'משקל',
                    # and contains the regex of the weight.
                    weight_matches = WEIGHT_REGEX.findall(value)
                    if len(weight_matches) > 0:
                        weight_text = weight_matches[0]
                        laptop_data['weight'] = float(weight_text)

        return laptop_data

    def extract_laptop_price(self, response)->float:
        '''
        Extracts the laptop's price from the laptop's page
        '''

        # the buy now label contains the price
        buy_now_label = response.css('div.no-padding-desktop > div:nth-child(1) > h2:nth-child(1)').get()

        # beautifulsoup is used here because scrapy doesn't handle well the special symbols in the html
        # code.
        # not using beautifulsoup for the whole document for performance reasons, instead using it
        # just on the buy now label
        # using find('h2') because beautifulsoup appends an html and body tags to the given html document
        # if it doesn't have these tags.
        bs = BeautifulSoup(buy_now_label,'html5lib').find('h2')

        # find the first child that contains the '₪' symbol
        buy_now_label_text = next(child for child in bs.children if '₪' in child)

        price_matches = PRICE_REGEX.findall(buy_now_label_text)

        # sometimes the buy label contains another number before the price, inside a hidden span,
        # so we should always just take the last match, which will be the price
        price_text = price_matches[-1]

        # remove the ',' from the price if it is present
        price_text = price_text.replace(',','')

        return float(price_text)

    def extract_laptop_data(self, response)->dict:
        '''
        Extracts a dictionary of laptop data from the laptop's page
        '''

        # key value data
        laptop_data = self.extract_laptop_key_value_data(response)


        # additional fields that are not in key value pairs

        # url
        laptop_data['url'] = response.url

        # images
        laptop_data['image_urls'] = self.extract_laptop_images(response)

        # brand
        # extracting the brand from the url to the brand's lastprice page
        brand_url = response.css('a.h4::attr(href)').get()
        laptop_data['brand'] = brand_url.split('/')[-1]

        # model
        laptop_data['model'] = response.css('span.h4::text').get()

        # price
        laptop_data['price'] = self.extract_laptop_price(response)

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

