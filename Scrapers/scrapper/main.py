from pathlib import Path
from spiders.ivory import IvorySpider
from spiders.lastprice import LastPriceSpider
from scrapy.crawler import CrawlerProcess

if __name__ == '__main__':
    laptops_path = Path(__file__).parent / 'laptops.json'
    if laptops_path.is_file():
        laptops_path.unlink()

    process = CrawlerProcess()
    process.crawl(LastPriceSpider)
    process.start()
