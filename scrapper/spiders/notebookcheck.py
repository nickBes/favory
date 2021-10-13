import scrapy
from scrapy.http import FormRequest,HtmlResponse
from enum import Enum
from scrapy.http.request import Request
from scrapy.http.response.text import TextResponse
from w3lib.html import remove_tags
from bs4 import BeautifulSoup

NOTEBOOKCHECK_CPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html?'
NOTEBOOKCHECK_GPU_SEARCH_URL = 'https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html'

class PuType(Enum):
    CPU = 0
    GPU = 1

    def get_first_letter(self)->str:
        return self.name[0].lower()
    
    def get_name(self)->str:
        return self.name.lower()

    def get_notebookcheck_search_url(self)->str:
        return NOTEBOOKCHECK_CPU_SEARCH_URL if self == PuType.CPU else NOTEBOOKCHECK_GPU_SEARCH_URL

class NotebookCheckSpider(scrapy.Spider):
    # this spider is responsible for scraping benchmark data from notebookcheck.com.
    #
    # before reading through the code, it is important to understand the following conecepts:
    #
    # 1. response meta - this spider uses the response meta to store data on each sent request. when sending the initial
    # search request, the meta only contains information about the pu type, the device's id, and holds the current 
    # laptop_data dictionary that holds information about the laptop being scraped. the laptop data is updated when
    # fetching information about the laptop's cpu or gpu. once the search is finished, the device's url is found, 
    # and then added to the meta. this is the final form of the meta, in which it contains 4 fields - `pu_type`,
    # `device_id`, `laptop_data`, and `url`. the only changes to the meta from here are changes to the `laptop_data`
    # dict, or a modification of the `url` or `device_id` field after we have finished scraping the first device - 
    # the cpu. for example, first we search for the cpu, and we save its url and device id, but once we finish scraping
    # the cpu, we search for the gpu, and then we change the `url` and the `device_id` fields to those of the gpu). also,
    # there are some methods in this class that require the reponse's meta after fetching some info, but since we use
    # caching (described in section 3), sometimes we will not have an actual response, and we will need to craft a fake 
    # response meta, just to be able to call these methods without sending an actual request. when faking the response 
    # meta we will create a dictionary with all the 3 meta fields described previously.

    def __init__(self):
        # for each dedicated device we're storing it's benchmark in a way
        # that the key is the device's name and the value is the benchark object
        self.dedicated_benches = {}
        # same as for self.dedicated_benches but it includes only benchmarks
        # for integrated devices (integrated gpus) and keys are the urls of 
        # each integrated device
        self.integrated_benches = {}
        # a mapping between each integrated device and it's notebookcheck url
        # so the key is the device's name and the value is the url
        self.integrated_urls = {}
        self.laptops = []

    def _get_devices(self, laptops):
        '''
        Given an organized laptop data array return non repetetive arrays of
        dedicated devices and integrated gpus
        '''
        dedicated = []
        integrated = []
        for laptop in laptops:
            cpu = {
                'id': laptop.get('cpu'),
                'pu_type': PuType.CPU,
                'has_integrated_gpu': laptop.get('integrated')
            }
            if cpu not in dedicated:
                dedicated.append(cpu)
            gpu = {
                'id': laptop.get('gpu'),
                'pu_type': PuType.GPU
            }
            if laptop.get('integrated'):
                gpu['cpu'] = laptop.get('cpu')
                if gpu not in integrated:
                    integrated.append(gpu)
            else:
                if gpu not in dedicated:
                    dedicated.append(gpu)
        return dedicated, integrated

    def _create_notebookcheck_device_form_request(self, device, meta)->FormRequest:
        formdata = {
            # the search field is just the string that we want to search
            'search': device['id'],
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
            f'{device["pu_type"].get_name()}_fullname': '1',
        }

        print('searching for device:',device)

        meta['device'] = device
        return FormRequest(device['pu_type'].get_notebookcheck_search_url(),
                        formdata=formdata,
                        callback=self._parse_dedicated_search_results,
                        meta=meta)

    def with_benchmarks(self)->FormRequest:
        '''
        Initiate recursive requests of pus
        '''
        dedicated, integrated = self._get_devices(self.laptops)
        first_pu = dedicated.pop()
        return self._create_notebookcheck_device_form_request(device=first_pu, meta={
            'dedicated': dedicated,
            'integrated': integrated
        })

    def _with_benchmarks_recursive(self, response:HtmlResponse):
        '''
        This method will iterate recursively over the devices (dedicated / integrated)
        and for each devices it'll save relavant benchmark data without duplicates
        '''
        response = self._fix_response_broken_html(response)
        meta = response.meta

        # extract a much more percise name of the device
        device_name = response.css('#content > div:nth-child(1) > div:nth-child(1) > h1:nth-child(1)::text').get()

        # save the integrated gpu url if relevant
        if meta['device'].get('has_integrated_gpu'):
            integrated_gpu_url = self._get_integrated_gpu_url(response)
            self.integrated_urls[meta['device']['id']] = integrated_gpu_url

        # extract the benchmarks of the device
        benchmarks = self._parse_device_benchmarks(response)

        # save benchmarks
        bench_data = {
            'name': device_name,
            'benchmarks': benchmarks
        }
        # each integrated device object has a refrence to a cpu with a 
        # 'cpu' key. using that we can identify whether the previous
        # device was integrated or dedicated
        if meta['device'].get('cpu') != None:
            self.integrated_benches[response.url] = bench_data
        else:
            self.dedicated_benches[meta['device']['id']] = bench_data

        yield from self.start_next_device_request(meta)

    def start_next_device_request(self, meta):
        # stops / starts recursion based on remaining devices
        if len(meta['dedicated']) == 0:
            if len(meta['integrated']) == 0:
                yield from self._finish()
            else:
                yield from self.start_next_integrated_device_request(meta)
        else:
            yield from self.start_next_dedicated_device_request(meta)


    def start_next_dedicated_device_request(self, meta)->Request:
        # checks if the dedicated device has been scraped
        # if it has been scraped, it continues to the next one
        while True:
            # during the while loop the dedicated devices array might be empty,
            # so we need to start the integrated gpu query
            if len(meta['dedicated']) == 0:
                start_dedicated_check = False
                next_integrated_gpu = meta['integrated'].pop()
                integrated_gpu_url = self.integrated_urls[next_integrated_gpu['cpu']]
                meta['device'] = next_integrated_gpu
                yield Request(url=integrated_gpu_url, meta=meta, callback=self._with_benchmarks_recursive)
                break
            else:
                next_pu = meta['dedicated'].pop()

                # if the device has an integrated gpu we should scrape it even though
                # we have its benchmarks, because we need its integrated gpu
                if next_pu['id'] not in self.dedicated_benches or next_pu['has_integrated_gpu']:
                    yield self._create_notebookcheck_device_form_request(device=next_pu, meta=meta)
                    break

    def start_next_integrated_device_request(self, meta)->Request:
        '''
        Starts next request for an integrated device and check for duplicates
        '''
        # checks if an integrated url has been scrapped
        # if it has been it goes to the next integrated device
        # and checks again
        while True:
            # during the while loop the integrated gpu array might be empty
            # from here we can finish the query
            if len(meta['integrated']) == 0:
                yield from self._finish()
                break
            else:
                next_integrated_gpu = meta['integrated'].pop()
                integrated_gpu_url = self.integrated_urls[next_integrated_gpu['cpu']]
                if integrated_gpu_url == None:
                    continue

                if integrated_gpu_url not in self.integrated_benches:
                    meta['device'] = next_integrated_gpu
                    yield Request(url=integrated_gpu_url, meta=meta, callback=self._with_benchmarks_recursive)
                    break

    def _finish(self):
        '''
        Iterates over the laptops, saves each relevant benchmark array as well
        as renaming the devices to more accurate names and yields them
        '''
        for laptop in self.laptops:
            print(laptop)
            cpu_name = laptop['cpu']
            laptop['cpu_bench'] = self.dedicated_benches[cpu_name]['benchmarks']
            laptop['cpu'] = self.dedicated_benches[cpu_name]['name']
            if laptop['integrated']:
                key = self.integrated_urls[cpu_name]
                if key == None:
                    continue
                laptop['gpu_bench'] = self.integrated_benches[key]['benchmarks']
                laptop['gpu'] = self.integrated_benches[key]['name']
            else:
                gpu_name = laptop['gpu']
                laptop['gpu_bench'] = self.dedicated_benches[gpu_name]['benchmarks']
                laptop['gpu'] = self.dedicated_benches[gpu_name]['name']

            # sometimes model and model or weight don't exist
            # the fast fix for that is ignore the laptop that doesnt have these properties
            try: 
                # find the laptop's name using the brand and model
                laptop['name'] = laptop['brand'] + ' ' + laptop['model']

                # assign the laptop's weight and ram as benchmarks
                laptop['cpu_bench']['ram'] = laptop['ram']
                del laptop['ram']

                # using the weight in the denominator because we want the score to get higher
                # as the weight grows smaller, and the 1000 to avoid using numbers that are 
                # too small, to avoid percision issues
                laptop['cpu_bench']['weight'] = 1000/laptop['weight']
                del laptop['weight']
            except:
                continue

            yield laptop

    def _parse_dedicated_search_results(self, response:HtmlResponse):
        # there should only be a single search result, so we follow the first result
        device_page_url = response.css('td.specs:nth-child(2) > a:nth-child(1)::attr(href)').get()

        # if no results were found, skip this device
        if device_page_url == None:
            print()
            print('WARNING: no search results for device: ',response.meta['device'])
            print('continuing to next device')
            print()

            yield from self.start_next_device_request(response.meta)
        else:
            yield Request(url=device_page_url, meta=response.meta, callback=self._with_benchmarks_recursive)


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
                unfixed_url = info_table_row.css('td:nth-child(2) > a::attr(href)').get()

                # the url might not exist so we return none if there's no url
                return None if unfixed_url == None else remove_tags(unfixed_url)
        
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
