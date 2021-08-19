import scrapy
from scrapy.http import FormRequest,HtmlResponse
from enum import Enum
from dataclasses import dataclass
from w3lib.html import remove_tags
from bs4 import BeautifulSoup
from spiders.process_data.device_id_detector import detect_cpu_id, detect_gpu_id

NOTEBOOKCHECK_CPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html?'
NOTEBOOKCHECK_GPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html'

class PuType(Enum):
    CPU = 0
    GPU = 1

    def get_first_letter(self)->str:
        return self.name[0].lower()
    
    def get_name(self)->str:
        return self.name.lower()

def create_notebookcheck_search_form_data(device_id:str, pu_type:PuType)->dict:
    '''
    creates a dictionary of request data that notebook check expects when sending a POST request
    to a search page.
    '''
    return {
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

def is_integrated_gpu(gpu_id:str)->bool:
    '''
    checks if the given gpu id is of an integrated gpu.
    the check is currently very simple, but seems to work for all known examples.
    '''
    return 'Graphics' in gpu_id

class NotebookCheckSpider(scrapy.Spider):
    def scrape_laptop_cpu_and_gpu_from_notebookcheck(self, laptop_data: dict):
        '''
        given a laptop_data dictionary scraped from a laptops website (for ex. Ivory), scrapes
        information about the laptop's cpu and gpu from notebookcheck.com, adds it to the laptop_data
        dictionary, and yields the resulting dictionary with full data about the laptop.
        '''
            # if the gpu is an integrated gpu, we must get its full id from the cpu's page, so we must first
            # scrape the cpu data, and when the cpu data is scraped we should have the integrated gpu's full
            # name, and we can use it to scrape it as well.
        return self._get_cpu_benchmarks(laptop_data)

    def _get_cpu_benchmarks(self, laptop_data:dict):
        '''
        scrapes benchmark information about the cpu specified in the laptop_data's 'cpu' field,
        and stores it in laptop_data['cpu_benchmarks']. when done scraping the cpu benchmarks, 
        starts scraping gpu benchmarks.
        '''
        cpu_id = detect_cpu_id(laptop_data['cpu'])

        yield FormRequest(
            NOTEBOOKCHECK_CPU_SEARCH_URL, 
            formdata = create_notebookcheck_search_form_data(cpu_id, PuType.CPU), 
            callback = self._parse_search_results,
            meta = {
                'pu_type': PuType.CPU,
                'laptop_data': laptop_data,
            })

    def _get_gpu_benchmarks(self, gpu_id: str, laptop_data: dict):
        '''
        scrapes benchmark information about the given gpu, and stores it in
        laptop_data['gpu_benchmarks']. when done scraping the gpu benchmarks yields
        the laptop_data dictionary, which at that point will contain all information
        about the laptop, the cpu and the gpu.
        '''
        yield FormRequest(
            NOTEBOOKCHECK_GPU_SEARCH_URL,
            formdata = create_notebookcheck_search_form_data(gpu_id, PuType.GPU),
            callback = self._parse_search_results,
            meta = {
                'pu_type': PuType.GPU,
                'laptop_data': laptop_data
            })

    def _parse_search_results(self, response:HtmlResponse):
        # there should only be a single search result, so we follow the first result
        device_page_url = response.css('td.specs:nth-child(2) > a:nth-child(1)::attr(href)').get()
        yield response.follow(device_page_url, callback=self._parse_device_page, meta=response.meta)

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

        # rewrite the device's description with its percise name
        laptop_data[pu_type.get_name()] = device_name

        # save the device's benchmarks to the laptop_data dictionary
        laptop_data[f'{pu_type.get_name()}_benchmarks'] = benchmarks

        # if we finished scraping the cpu, we should now scrape the gpu
        if pu_type == PuType.CPU:
            # check if the laptop's gpu is an integrated gpu
            gpu_id = detect_gpu_id(laptop_data['gpu'], device_description)
            if is_integrated_gpu(gpu_id):
                # if the gpu is an integrated gpu, we can follow the link to the
                # integrated gpu that is found in the cpu's page
                integrated_gpu_url = self._get_integrated_gpu_url(response)
                yield response.follow(integrated_gpu_url, callback=self._parse_device_page, meta={
                    'pu_type': PuType.GPU,
                    'laptop_data': laptop_data
                })
            else:
                # if the gpu is not an integrated gpu, follow the usual routine and 
                # just search for it using its id to find its url
                return self._get_gpu_benchmarks(gpu_id, laptop_data)
        elif pu_type == PuType.GPU:
            # if we finished scraping the gpu, then we have both cpu and gpu data (since
            # cpu is scraped before gpu), and thus we have all information that we need about
            # the laptop, so we can yield it.
            yield laptop_data
