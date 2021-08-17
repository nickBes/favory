from pathlib import Path
from spiders.ivory import IvorySpider
from spiders.notebookcheck import NotebookCheckSpider
from scrapy.crawler import CrawlerProcess

if __name__ == '__main__':
    laptops_path = Path(__file__).parent / 'laptops.json'
    if laptops_path.is_file():
        laptops_path.unlink()

    process = CrawlerProcess()
    #process.crawl(IvorySpider)
    process.crawl(NotebookCheckSpider)
    process.start()