import scrapy
from scrapy.http import FormRequest

NOTEBOOKCHECK_CPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html?'
NOTEBOOKCHECK_GPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html'

class NotebookCheckSpider(scrapy.Spider):
    name = "notebookcheck"
    def start_requests(self):
        yield from self.get_cpu_benchmarks('AMD 3020e')
        yield from self.get_gpu_benchmarks('AMD Radeon Graphics')

    def create_notebookcheck_search_data(self, device_id:str)->dict:
        '''
        creates a dictionary of request data that notebook check expects when sending a POST request
        to a search page.
        '''
        return {
            'search': device_id,
            'or': '0',
            'codename': '1',
        }
    def get_cpu_benchmarks(self, cpu_id:str):
        yield FormRequest(NOTEBOOKCHECK_CPU_SEARCH_URL, formdata = self.create_notebookcheck_search_data(cpu_id), callback = self.parse_search_results)

    def get_gpu_benchmarks(self, gpu_id:str):
        yield FormRequest(NOTEBOOKCHECK_GPU_SEARCH_URL, formdata = self.create_notebookcheck_search_data(gpu_id), callback = self.parse_search_results)

    def parse_search_results(self, response):
        yield {'test':'yes'}
