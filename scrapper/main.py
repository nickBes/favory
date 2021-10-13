from pathlib import Path
from spiders.ivory import IvorySpider
# from spiders.lastprice import LastPriceSpider
from spiders.bug import BugSpider
from scrapy.crawler import CrawlerProcess

if __name__ == '__main__':
    # remove previous laptop files
    laptops_path = Path(__file__).parent
    file_iterator = laptops_path.glob('*.json')
    for file in file_iterator:
        file.unlink()

    process = CrawlerProcess()
    process.crawl(BugSpider)
    process.crawl(IvorySpider)
    process.start()
