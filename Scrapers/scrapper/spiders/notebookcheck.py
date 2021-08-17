import scrapy
from scrapy.http import FormRequest,HtmlResponse
from enum import Enum
from dataclasses import dataclass
from w3lib.html import remove_tags
from spiders.process_data.device_id_detector import detect_gpu_id

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
        yield from self.get_cpu_and_gpu_benchmarks('AMD 3020e', 'AMD Radeon Graphics')

    def get_cpu_and_gpu_benchmarks(self, cpu_id: str, gpu_id: str):
        if is_integrated_gpu(gpu_id):
            # if the gpu is an integrated gpu, we must get its full id from the cpu's page, so we must first
            # scrape the cpu data, and when the cpu data is scraped we should have the integrated gpu's full
            # name, and we can use it to scrape it as well.
            yield from self._get_cpu_benchmarks(cpu_id, True)
        else:
            yield from self._get_cpu_benchmarks( cpu_id)
            yield from self._get_gpu_benchmarks(gpu_id)

    def _get_cpu_benchmarks(self, cpu_id:str, scrape_integrated_gpu: bool = False):
        yield FormRequest(
            NOTEBOOKCHECK_CPU_SEARCH_URL, 
            formdata = create_notebookcheck_search_data(cpu_id, PuType.CPU), 
            callback = self._parse_search_results,
            meta = {
                'pu_type': PuType.CPU,
                'cpu_id': cpu_id, 
                'scrape_integrated_gpu': scrape_integrated_gpu
            })

    def _get_gpu_benchmarks(self, gpu_id:str):
        yield FormRequest(
            NOTEBOOKCHECK_GPU_SEARCH_URL,
            formdata = create_notebookcheck_search_data(gpu_id, PuType.GPU),
            callback = self._parse_search_results,
            meta = {'pu_type': PuType.GPU})

    def _parse_search_results(self, response:HtmlResponse):
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
        for info_table_row in response.css('.gputable > tr'):
            header = info_table_row.css('td:nth-child(1)::text').get()
            # note that ::text is not used here because some values contain
            # html tags, and we still want to parse them. this is also the
            # reason why the remove_tags function is used.
            value = info_table_row.css('td:nth-child(2)').get()

            # some rows don't have a value
            if value is not None:
                info[header] = remove_tags(value)

        return info
        

    def _parse_device_page(self, response:HtmlResponse):
        '''
        in the notebookcheck site, each device (cpu,gpu) has a dedicated page. 
        this method extracts information from the page about the device.
        '''
        info_table = self._parse_device_info_table(response)

        # if this results page is for a cpu, we might need to issue a request to scrape the
        # integrated gpu, if it was requested.
        if response.meta['pu_type'] == PuType.CPU and response.meta['scrape_integrated_gpu']:
            gpu_id = detect_gpu_id(info_table['GPU'], response.meta['cpu_id'])
            yield from self._get_gpu_benchmarks(gpu_id)

        yield {}
