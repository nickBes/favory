from spiders.ivory import IvorySpider
from scrapy.crawler import CrawlerProcess

if __name__ == '__main__':
    process = CrawlerProcess()
    process.crawl(IvorySpider)
    process.start()