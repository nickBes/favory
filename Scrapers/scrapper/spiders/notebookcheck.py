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

def create_notebookcheck_search_data(device_id:str, pu_type:PuType)->dict:
    '''
    creates a dictionary of request data that notebook check expects when sending a POST request
    to a search page.
    '''
    return {
        'search': device_id,
        'or': '0',
        f'{pu_type.get_name()}_fullname': '1',
    }

def is_integrated_gpu(gpu_id:str)->bool:
    '''
    checks if the given gpu id is of an integrated gpu.
    the check is currently very simple, but seems to work for all known examples.
    '''
    return 'Graphics' in gpu_id

class NotebookCheckSpider(scrapy.Spider):
    name = "notebookcheck"
    def start_requests(self):
        yield from self.scrape_laptop_cpu_and_gpu({'cpu':'AMD 3020e', 'gpu':'AMD Radeon Graphics'})

    def scrape_laptop_cpu_and_gpu(self, laptop_data: dict):
        '''
        given a laptop_data dictionary scraped from a laptops website (for ex. Ivory), scrapes
        information about the laptop's cpu and gpu from notebookcheck.com, adds it to the laptop_data
        dictionary, and yields the resulting dictionary with full data about the laptop.
        '''
            # if the gpu is an integrated gpu, we must get its full id from the cpu's page, so we must first
            # scrape the cpu data, and when the cpu data is scraped we should have the integrated gpu's full
            # name, and we can use it to scrape it as well.
        yield from self._get_cpu_benchmarks(laptop_data)

    def _get_cpu_benchmarks(self, laptop_data:dict):
        '''
        scrapes information about the cpu specified in the laptop_data's 'cpu' field,
        and replaces the cpu's name in the laptop_data's 'cpu' field with the scraped information,
        so that after this method finishes scraping the cpu, laptop_data['cpu'] contains a 
        dictionary with all information about the cpu.
        '''
        cpu_id = detect_cpu_id(laptop_data['cpu'])

        yield FormRequest(
            NOTEBOOKCHECK_CPU_SEARCH_URL, 
            formdata = create_notebookcheck_search_data(cpu_id, PuType.CPU), 
            callback = self._parse_search_results,
            meta = {
                'pu_type': PuType.CPU,
                'laptop_data': laptop_data,
            })

    def _get_gpu_benchmarks(self, gpu_id: str, laptop_data: dict):
        '''
        scrapes information about the given gpu of the given laptop, and stores the
        scraped information in the laptop_data's 'gpu' field, so that after this method
        finishes scraping the gpu, laptop_data['gpu'] contains a dictionary with all 
        information about the gpu.
        '''
        yield FormRequest(
            NOTEBOOKCHECK_GPU_SEARCH_URL,
            formdata = create_notebookcheck_search_data(gpu_id, PuType.GPU),
            callback = self._parse_search_results,
            meta = {
                'pu_type': PuType.GPU,
                'laptop_data': laptop_data
            })

    def _parse_search_results(self, response:HtmlResponse):
        # there should only be a single search result, so we follow the first result
        device_page_url = response.css('td.specs:nth-child(2) > a:nth-child(1)::attr(href)').get()
        yield response.follow(device_page_url, callback=self._parse_device_page, meta=response.meta)

    def _parse_device_info_table(self, response:HtmlResponse)->dict:
        '''
        in the notebookcheck site, each device (cpu, gpu) has a dedicated page that contains 
        an info table containing general information about the device in a key-value format. 
        this method extracts this info table into a dictionary.
        '''

        # read the info table into a dictionary
        info = {}
        for info_table_row in response.css('.gputable > tbody > tr'):
            header = info_table_row.css('td:nth-child(1)::text').get()
            # note that ::text is not used here because some values contain
            # html tags, and we still want to parse them. this is also the
            # reason why the remove_tags function is used.
            value = info_table_row.css('td:nth-child(2)').get()

            # some rows don't have a value
            if value is not None:
                info[header] = remove_tags(value)

        return info
        

    def _parse_device_benchmarks(self, response:HtmlResponse)->dict:
        '''
        in the notebookcheck site, each device (cpu, gpu) has a dedicated page that contains 
        a list of benchmarks for the device, and the device's score in each of these benchmarks.
        this method extracts the benchmark info into a dictionary of the form:
        { benchmark name => device's score in benchmark }
        '''

        benchmarks = {}
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

        device_name = response.css('#content > div:nth-child(1) > div:nth-child(1) > h1:nth-child(1)::text').get()
        device_info = self._parse_device_info_table(response)
        benchmarks = self._parse_device_benchmarks(response)

        # add the benchmarks and the device name to the device_info dict, so that
        # we have a single dictionary containing all of the device's information.
        device_info['benchmarks'] = benchmarks
        device_info['name'] = device_name

        # save the informatoin about the device in the laptop_data dictionary
        laptop_data = response.meta['laptop_data']
        pu_type = response.meta['pu_type']
        # save the original device description before overwriting it
        device_description = laptop_data[pu_type.get_name()]
        # rewrite the device description and write the device info instead
        laptop_data[pu_type.get_name()] = device_info

        # if we finished scraping the cpu, we should now scrape the gpu
        if pu_type == PuType.CPU:
            # check if the laptop's gpu is an integrated gpu
            gpu_id = detect_gpu_id(laptop_data['gpu'], device_description)
            if is_integrated_gpu(gpu_id):
                # if the gpu is an integrated gpu, we should get a more percise name for it
                # from the cpu's device info
                gpu_id = detect_gpu_id(device_info['GPU'], device_description)
            yield from self._get_gpu_benchmarks(gpu_id, laptop_data)
        elif pu_type == PuType.GPU:
            # if we finished scraping the gpu, then we have both cpu and gpu data (since
            # cpu is scraped before gpu), and thus we have all information that we need about
            # the laptop, so we can yield it.
            yield laptop_data
