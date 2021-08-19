import scrapy
from scrapy.http import FormRequest,HtmlResponse
from enum import Enum
from dataclasses import dataclass
from scrapy.http.request import Request
from w3lib.html import remove_tags
from bs4 import BeautifulSoup
from spiders.process_data.device_id_detector import detect_cpu_id, detect_gpu_id

NOTEBOOKCHECK_CPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html?'
NOTEBOOKCHECK_GPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html'

@dataclass
class DeviceData:
    name: str
    description:str
    benchmarks:dict
    integrated_gpu_url:str

class PuType(Enum):
    CPU = 0
    GPU = 1

    def get_first_letter(self)->str:
        return self.name[0].lower()
    
    def get_name(self)->str:
        return self.name.lower()

def is_integrated_gpu(gpu_id:str)->bool:
    '''
    checks if the given gpu id is of an integrated gpu.
    the check is currently very simple, but seems to work for all known examples.
    '''

    return 'Graphics' in gpu_id

class NotebookCheckSpider(scrapy.Spider):
    # important notes:
    #
    # 1. response meta - this spider uses the response meta to store data on each sent request. when sending the initial
    # search request, the meta only contains information about the pu type, and holds the current laptop_data 
    # dictionary that holds information about the laptop being scraped, and is updated when fetching 
    # information about the laptop's cpu or gpu. once the search is finished, the device's url is found, 
    # and then added to the meta. this is the final form of the meta, in which it contains 3 fields - `pu_type`,
    # `laptop_data`, and `url`. the only changes to the meta from here are changes to the `laptop_data` dict, 
    # or a modification of the `url` field, if the url for the next device was found (for example, first we search
    # for the cpu, and we save its url, but once we finish scraping the cpu, we search for the gpu, and then we
    # change the value of the `url` field to the gpu's url). also, there are some methods in this class that 
    # require the reponse's meta after fetching some info, but since we use caching (described in section 3), sometimes 
    # we will not have an actual response, and we will need to craft a fake response meta, just to be able to call
    # these methods without sending an actual request. when faking the response meta we will create a dictionary
    # with all the 3 meta fields described previously.
    #
    #
    # 2. duplicate requests - sometimes, two or more laptops might have the same device (same cpu or same gpu).
    # if we didn't use caching, in such case the spider would just send the same request twice. scrapy has a
    # mechanism of recognizing when the same request is sent twice, and in such case it just ignores the request.
    # this is a big problem, since some laptops might just not be scraped, because their requests weren't sent,
    # and thus the callback wasn't called, and the laptop wasn't yielded. using caching (described in section 3) 
    # **mostly** solves the problem, but in some scenarios, the spider will still send duplicate requests.
    # an example of such scenario:
    # thread 'A' start scraping url 'U', he gets the response and starts processing it. before
    # thread 'A' finishes processing the response, thread 'B' also sends a request for url 'U',
    # but scrapy will see a duplicate request and will thus ignore it, and the second laptop won't
    # be scraped.
    # such a scenario can happen both for search requests, and device page requests.
    # thus, forcing scrapy to send duplicate requests (by setting the `dont_filter` parameter in the
    # `FormRequest`'s constructor to true) is still required.
    #
    #
    # 3. caching - this spider uses caching, since sometimes two or more laptops might have the same device (same
    # cpu or same gpu), and thus the same page will be scraped twice. this is very inefficient, and caching speeds
    # this process up, and **mostly** resolves the problem of scarping a page twice. for more information on why
    # caching does not completely solve this problem, read section 2. the spider caches both search results, and device 
    # information that was scraped from a device's page. 
    #
    # for more information about caching read the documentation on the following methods:
    # `_get_device_data_cache` and `_get_device_search_cache`.
    #

    def __init__(self):
        # initialize the caches for each device
        self._cpu_data_cache = {}
        self._gpu_data_cache = {}
        self._cpu_search_cache = {}
        self._gpu_search_cache = {}

    def scrape_laptop_cpu_and_gpu_from_notebookcheck(self, laptop_data: dict):
        '''
        given a laptop_data dictionary scraped from a laptops website (for ex. Ivory), scrapes
        information about the laptop's cpu and gpu from notebookcheck.com, adds it to the laptop_data
        dictionary, and yields the resulting dictionary with full data about the laptop.
        '''

        # if the gpu is an integrated gpu, we must get its full id from the cpu's page, so we must first
        # scrape the cpu data, and when the cpu data is scraped we should have the integrated gpu's full
        # name, and we can use it to scrape it as well.
        return self._search_cpu(laptop_data)

    def _get_device_data_cache(self, pu_type: PuType)->dict:
        '''
        returns the device data cache.
        the cache is a dictionary that maps each device's url to the device's data (`DeviceData`).
        for more info about caching, read section 3 in the class's documentation.
        '''

        # find the field name of the cache given the pu type
        field_name = f'_{pu_type.get_name()}_data_cache'
        return getattr(self, field_name)

    def _get_device_search_cache(self, pu_type: PuType)->dict:
        '''
        returns the device search cache.
        the cache is a dictionary that maps each device's id to the link of the first search result.
        for more info about caching, read section 3 in the class's documentation.
        '''

        # find the field name of the cache given the pu type
        field_name = f'_{pu_type.get_name()}_search_cache'
        return getattr(self, field_name)

    def _create_notebookcheck_search_request(self, device_id:str, laptop_data, pu_type:PuType)->FormRequest:
        formdata = {
            # the search field is just the string that we want to search
            'search': device_id,
            # the or field is a boolean field (false = '0', true = '1') which tells notebookcheck
            # how we want it to connect the words. if the value of the or field is '0', it tells
            # notebookcheck that we want to perform an 'and' operation on the words in our search 
            # string, such that the results must contain *all* words in the search string. on the
            # other hand if the value of the or field is '1', it tells notebookcheck that we want
            # to perform an 'or' operation on the words in our search string, such that the results
            # must contain any of the words in our search string. here we use a value of '0', which
            # uses the 'and' operation on our words, because we want the search to be very percise
            # and to find only the single matching device given the device's id.
            'or': '0',
            # this option tell notebookcheck that the results should include a link to the device's
            # page.
            f'{pu_type.get_name()}_fullname': '1',
        }
        search_url = NOTEBOOKCHECK_CPU_SEARCH_URL if pu_type == PuType.CPU else NOTEBOOKCHECK_GPU_SEARCH_URL
        return FormRequest(
            search_url, 
            formdata = formdata,
            callback = self._parse_search_results,
            # for information on this field, and on why it is set to True, read section 2 in the 
            # class's documentation
            dont_filter = True,
            meta = {
                'pu_type': PuType.CPU,
                'laptop_data': laptop_data,
            })

    def _search_device_or_use_cache(self, device_id: str, laptop_data: dict, pu_type: PuType):
        '''
        finds the device's page url by searching it or by looking it up in the cache.
        once the device's page url is found it fetches and scrapes it.
        '''

        cache = self._get_device_search_cache(pu_type)
        if device_id in cache:
            device_page_url = cache[device_id]
            # the `_fetch_device_page_or_use_cached_data` method requires a response meta, but we don't actually
            # have a response since we used the cache, so we must craft a fake response meta
            response_meta = {
                'pu_type': pu_type,
                'laptop_data': laptop_data,
                'url': device_page_url
            }
            yield from self._fetch_device_page_or_use_cached_data(device_page_url, response_meta)
        else:
            yield self._create_notebookcheck_search_request(device_id, laptop_data, pu_type)

    def _search_cpu(self, laptop_data:dict):
        '''
        seaches and scrapes benchmark information about the cpu specified in the laptop_data's 'cpu' field,
        and stores it in laptop_data['cpu_benchmarks']. when done scraping the cpu benchmarks, 
        starts scraping gpu benchmarks.
        '''

        cpu_id = detect_cpu_id(laptop_data['cpu'])
        return self._search_device_or_use_cache(cpu_id, laptop_data, PuType.CPU)

    def _search_gpu(self, gpu_id: str, laptop_data: dict):
        '''
        searches and scrapes benchmark information about the given gpu, and stores it in
        laptop_data['gpu_benchmarks']. when done scraping the gpu benchmarks yields
        the laptop_data dictionary, which at that point will contain all information
        about the laptop, the cpu and the gpu.
        '''

        return self._search_device_or_use_cache(gpu_id, laptop_data, PuType.CPU)

    def _parse_search_results(self, response:HtmlResponse):
        '''
        parses the search results page, and follows the link of the first result
        '''

        # there should only be a single search result, so we follow the first result
        device_page_url = response.css('td.specs:nth-child(2) > a:nth-child(1)::attr(href)').get()

        # update the device search cache
        pu_type = response.meta['pu_type']
        cache = self._get_device_search_cache(pu_type)
        cache

        return self._fetch_device_page_or_use_cached_data(device_page_url, response.meta)

    def _fetch_device_page_or_use_cached_data(self, device_page_url:str, response_meta:dict):
        '''
        fetches the device's page given its url and parses it, or if the url was already fetched
        and is found in the cache, gets the device information from there.
        '''

        cache = self._get_device_data_cache(response_meta['pu_type'])
        if device_page_url in cache:
            device_data = cache[device_page_url]
            yield from self._on_device_fetched(response_meta, device_data)
        else:
            # add the url to the meta, so that once done parsing the device info we can add it to the cache (since
            # the cache uses the url as the key).
            response_meta['url'] = device_page_url
            yield Request(
                device_page_url, 
                callback=self._parse_device_page, 
                # for information on this field, and on why it is set to True, read section 2 in the 
                # class's documentation
                dont_filter=True,
                meta=response_meta)

    def _fix_response_broken_html(self, response:HtmlResponse)->HtmlResponse:
        '''
        fixes a response with broken html by running it through the html5lib parser
        '''

        bs = BeautifulSoup(response.body, "html5lib")
        
        # we don't need script and style tags, and these will just slow us down
        bs.script.decompose()
        bs.style.decompose()

        fixed_body = str(bs)
        return response.replace(body = fixed_body)

    def _get_integrated_gpu_url(self, response:HtmlResponse)->str:
        '''
        in the notebookcheck site, each cpu has a dedicated page that contains an info
        table that contains general information about the cpu. one of the rows in the tables
        contains a link to the page of the cpu's integrated gpu. this method extracts this url
        and returns it.
        '''

        for info_table_row in response.css('.gputable > tbody > tr'):
            header = info_table_row.css('td:nth-child(1)::text').get()
            if header == 'GPU':
                # note that ::text is not used here because the integrated gpu is usually
                # an <a> tag with a link to the integrated GPU's page. values contain
                # html tags, and we still want to parse them. this is also the
                # reason why the remove_tags function is used.
                return remove_tags(info_table_row.css('td:nth-child(2) > a::attr(href)').get())
        
    def _parse_device_benchmarks(self, response:HtmlResponse)->dict:
        '''
        in the notebookcheck site, each device (cpu, gpu) has a dedicated page that contains 
        a list of benchmarks for the device, and the device's score in each of these benchmarks.
        this method extracts the benchmark info into a dictionary of the form:
        { benchmark name => device's score in benchmark }
        '''

        benchmarks = {}
        # note that the class named 'gpubench_div' is used here, no matter the pu type.
        # it is really confusing, but this is how the notebookcheck website is designed,
        # it uses this class for displaying both cpu and gpu benchmark, even though it
        # has the word 'gpu' in its name.
        for benchmark_div in response.css('div.gpubench_div'):
            benchmark_name = benchmark_div.css('div:nth-child(1)::text').get()
            # each benchmark's title contains the benchmark's series (for ex. WinRAR, TrueCrypt)
            # and the benchmark's actual name (for ex. WinRAR 4.0, TrueCrypt Twofish, TrueCrypt AES)
            # the benchmark's series is inside a <b> tag. when using the ::text selector
            # we tell scrapy to remove the <b> tag and all of it's content, so we're only 
            # left with the benchmark's name. but after the <b> tag a ' - ' is added to
            # seperate the benchmark's series and actual name, so we must remove it from
            # the start of the benchmark_name string to find the actual name.
            benchmark_name = benchmark_name[len(' - '):]

            # some benchmark names end with '*' for some reason, so remove it
            if benchmark_name.endswith('*'):
                benchmark_name = benchmark_name[:-1]

            # remove whitespace before and after the benchmark's name
            benchmark_name = benchmark_name.strip()

            benchmark_score = benchmark_div.css('div:nth-child(2) > div.paintAB_legend > span::text').get()

            # sometimes the benchmark's score contains additional words after the actual numeric socre
            # like units of measurements, or percentages. we want to remove these additional words
            # and only take the actual numeric score.
            benchmark_score = float(benchmark_score.split(' ')[0])

            benchmarks[benchmark_name] = benchmark_score
        
        return benchmarks

    def _parse_device_page(self, response:HtmlResponse):
        '''
        in the notebookcheck site, each device (cpu,gpu) has a dedicated page. 
        this method extracts information from the page about the device.
        '''

        response = self._fix_response_broken_html(response)

        # extract a much more percise name of the device
        device_name = response.css('#content > div:nth-child(1) > div:nth-child(1) > h1:nth-child(1)::text').get()

        # extract the benchmarks of the device
        benchmarks = self._parse_device_benchmarks(response)

        laptop_data = response.meta['laptop_data']
        pu_type = response.meta['pu_type']

        # save the original device description before overwriting it with the
        # percise device name
        device_description = laptop_data[pu_type.get_name()]

        # save the device data into the cache
        integrated_gpu_url = self._get_integrated_gpu_url(response)
        device_data = DeviceData(device_name, device_description, benchmarks, integrated_gpu_url)

        url = response.meta['url']

        cache = self._get_device_data_cache(pu_type)
        cache[url] = device_data

        return self._on_device_fetched(response.meta, device_data)

    def _on_device_fetched(self, response_meta:dict, device_data: DeviceData):
        '''
        this function is called once a device (cpu or gpu) was successfully fetched (from a url or from cache). it is
        responsible for deciding what the next move should be once this device was fetched. if the fetched device is a cpu,
        it sends a request for fetching the gpu. if the fetched device is a gpu, it has all laptop information that it 
        needs, and thus yields the laptop data.
        '''

        pu_type = response_meta['pu_type']
        laptop_data = response_meta['laptop_data']

        # rewrite the device's description with its percise name
        laptop_data[pu_type.get_name()] = device_data.name

        # save the device's benchmarks to the laptop_data dictionary
        laptop_data[f'{pu_type.get_name()}_benchmarks'] = device_data.benchmarks

        # if we finished scraping the cpu, we should now scrape the gpu
        if pu_type == PuType.CPU:
            # check if the laptop's gpu is an integrated gpu
            gpu_id = detect_gpu_id(laptop_data['gpu'], device_data.description)
            if is_integrated_gpu(gpu_id):
                # if the gpu is an integrated gpu, we can follow the link to the
                # integrated gpu that is found in the cpu's page
                integrated_gpu_url = device_data.integrated_gpu_url
                # change the pu type to gpu
                response_meta['pu_type'] = PuType.GPU
                yield from self._fetch_device_page_or_use_cached_data(integrated_gpu_url, response_meta)
            else:
                # if the gpu is not an integrated gpu, follow the usual routine and 
                # just search for it using its id to find its url.
                # note that it `yield from` must be used here even though `get_gpu_benchmarks`
                # only yields a single item, since using a `return` statement inside of a
                # generator raises a `StopIteration` exception.
                yield from self._search_gpu(gpu_id, laptop_data)
        elif pu_type == PuType.GPU:
            # if we finished scraping the gpu, then we have both cpu and gpu data (since
            # cpu is scraped before gpu), and thus we have all information that we need about
            # the laptop, so we can yield it.
            yield laptop_data

