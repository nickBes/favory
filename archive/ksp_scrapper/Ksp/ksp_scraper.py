import requests
import json
import jsonpickle
import io
import re
import itertools
from dataclasses import dataclass
from bs4 import BeautifulSoup,NavigableString

url='https://ksp.co.il/m_action/api/category/.268..271.?sort=5&page=%s'
ksp_headers={
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
	'Origin':'https://ksp.co.il',
	'referer':'https://ksp.co.il/web/cat/.268..271.'
}
ksp_session=requests.Session()
ksp_session.get('https://ksp.co.il/web/cat/.268..271.',headers=ksp_headers)
ksp_session.get(r'https://ksp.co.il/m_action/api/config?url=https://ksp.co.il/m_action/api/config?url=https%3A%2F%2Fksp.co.il%2Fweb%2Fcat%2F.268..271.',headers=ksp_headers)
ksp_session.get('https://ksp.co.il/m_action/api/promotion/get/select-slider/.268..271.',headers=ksp_headers)
ksp_session.get('https://ksp.co.il/m_action/api/category/.268..271.?sort=5',headers=ksp_headers)
ksp_session.get('https://ksp.co.il/m_action/api/promotion/get/between-products-to-select/.268..271.',headers=ksp_headers)

with open('cpus_ids.json') as f:
	cpus_ids = json.load(f)
with open('manufacturers_ids.json') as f:
	manufacturers_ids = json.load(f)
with open('os_ids.json') as f:
	os_ids = json.load(f)
with open('hdds_ids.json') as f:
	hdds_ids = json.load(f)

# page num is the 0-based index of the page
def get_url(page_num):
	return url%(page_num+1)

def fetch_page(page_num):	
	# ksp_session.get('https://accessibility.ksp.co.il/equalweb/accessibility.js',headers=ksp_headers)
	return ksp_session.get(get_url(page_num),headers=ksp_headers).json()

def remove_symbols(string):
	if string==None:
		return None
	return re.sub(r'[^a-zA-Z0-9\-\. ]','',string)

SCREEN_SIZE_PAT='%s ([0-9]+(?:\.[0-9]+)?)'%'מסך'
TOUCH_SCREEN_SIZE_PAT='%s ([0-9]+(?:\.[0-9]+)?)'%'מסך מגע בגודל'
COMPANY_PAT='%s ([a-zA-Z]+)'%'מבית'
RESOLUTION_PAT='%s ([a-zA-Z]+)'%'ברזולוציית'
CPU_PAT='%s (.*?),'%'מעבד'
RAM_PAT='%s ([0-9]+)GB'%'זיכרון פנימי בנפח'
HARD_DRIVE_TYPE_PAT='%s ([a-zA-Z]+)'%'כונן'
HARD_DRIVE_CAP_PAT1='%s [a-zA-Z]+ %s ([0-9]+)'%('כונן','בנפח')
HARD_DRIVE_CAP_PAT2='%s ([0-9]+)'%'נפח אחסון של'
OS_PAT='%s ([a-zA-Z0-9 ]+)'%'מערכת הפעלה'
GPU_PAT='%s %s ([a-zA-Z ®0-9]+) '%('מאיץ','גרפי')
GPU_MEM_PAT='([0-9]+)GB'
PRICE_PAT='%s ((?:[0-9]+[,\.]?)+)'%('מחיר:')

@dataclass
class HardDrive:
	drive_type:str
	capacity:int
@dataclass
class Gpu:
	model:str
	memory:int
class KspLaptopResult:
	def __init__(self,item_id):
		# self.elem=elem
		# center=self.elem.find(class_='linescenter')
		# self.title=str(next(center.find(class_='linestitle').find('a').descendants))
		# if self.title.endswith(' - '):
		# 	self.title=self.title[:-3]
		# details=self.elem.find(class_='linesdetail')

		self.item_id=item_id

		item=ksp_session.get('https://ksp.co.il/m_action/api/item/%s'%item_id,headers=ksp_headers).json()['result']
		# self.details_text=''
		# for d in details.descendants:
		# 	if type(d)==NavigableString:
		# 		self.details_text+=str(d).replace('\n','').replace('\t','')
		# 	elif d.name in ['b','strong']:
		# 		self.details_text+=str(d.text).replace('\n','').replace('\t','')
		# 	else:
		# 		if len(self.details_text)>0:
		# 			break

		self.name = item['data']['name']
		
		self.details_text = item['data']['smalldesc']

		self.company=self._find_in_details(COMPANY_PAT)
		# self.screen_size=self._find_in_details_typed(float,SCREEN_SIZE_PAT,TOUCH_SCREEN_SIZE_PAT)
		screen_size_str = next(tag['tag_name'] for tag in item['tags'] if tag['up_name']=="אינצ'")
		self.screen_size=float(screen_size_str.split("''")[0])
		# self.resolution=self._find_in_details(RESOLUTION_PAT)
		self.resolution=next(tag['tag_name'] for tag in item['tags'] if tag['up_name']=="רזולוציה")
		self.cpu=remove_symbols(self._find_in_details(CPU_PAT))
		cpu_identifier_matches=re.findall(r'(.+) ([0-9]+(?:\.[0-9]+)?GHz) - ([0-9]+(?:\.[0-9]+)?GHz)',self.cpu)
		if len(cpu_identifier_matches)==0:
			cpu_identifier=self.cpu
		else:
			cpu_identifier=cpu_identifier_matches[0][0]
		self.cpu_data=self.get_pu_data(cpu_identifier,'cpu')


		self.ram=self._find_in_details_typed(int,RAM_PAT)
		hd_type=self._find_in_details(HARD_DRIVE_TYPE_PAT)
		if hd_type==None:
			hd_type='HDD'
		hd_cap=self._find_in_details_typed(int,HARD_DRIVE_CAP_PAT1,HARD_DRIVE_CAP_PAT2)
		self.hard_drive=HardDrive(hd_type,hd_cap)
		self.os=self._find_in_details(OS_PAT)
		gpu_str=remove_symbols(self._find_in_details(GPU_PAT))
		if gpu_str == None and 'GPU' in self.cpu_data:
			gpu_str = self.cpu_data['GPU']
		if gpu_str!=None:
			matches=re.findall('(.*) '+GPU_MEM_PAT,gpu_str)
			if len(matches)>0:
				model,mem_str=matches[0]
				self.gpu=Gpu(model,int(mem_str))
			else:
				self.gpu=Gpu(gpu_str,None)
			gpu_identifier=gpu_str.split(' (')[0]
			if gpu_identifier.endswith('GB'):
				gpu_identifier = ' '.join(gpu_identifier.split(' ')[:-1])
			if 'Ti' in gpu_identifier:
				gpu_identifier = ' Ti'.join(gpu_identifier.split('Ti'))
			self.gpu_data=self.get_pu_data(gpu_identifier,'gpu')
		else:
			self.gpu_data=None
			self.gpu=None
		# price_box=self.elem.find(class_='linesprice')
		# matches=re.findall(PRICE_PAT,price_box.text)
		# if len(matches)==0:
		# 	self.price=None
		# else:
		# 	self.price=int(matches[0].strip().replace(',',''))
		self.price=item['data']['price']
		del self.details_text
	def __str__(self):
		return str(vars(self))
	def __repr__(self):
		return str(vars(self))
	def _find_in_details(self,*patterns):
		for p in patterns:
			matches=re.findall(p,self.details_text)
			if len(matches)>0:
				return matches[0].strip()
		return None
	def _find_in_details_typed(self,type_,*patterns):
		for p in patterns:
			matches=re.findall(p,self.details_text)
			if len(matches)>0:
				return type_(matches[0].strip())
		return None
	@property
	def cpu_model(self):
		return re.findall(r'(.*) [0-9]+.[0-9]+GHz - ',self.cpu)[0]
	@property
	def manufacturer_id(self):
		return manufacturers_ids[self.company.lower()]	
	@property
	def cpu_id(self):
		return cpus_ids[self.cpu_model]
	@property
	def screen_size_id(self):
		return str(int(self.screen_size))
	@property
	def os_type(self):
		return self.os.split(' ')[0] if self.os else None
	@property
	def os_id(self):
		return os_ids[self.os_type.lower()] if self.os else None
	@property
	def hard_drive_id(self):
		return hdds_ids[self.hard_drive.drive_type.lower()]
	def get_pu_data(self,identifier,pu_type):
		search_url = (
			'https://www.notebookcheck.net/Mobile-Processors-Benchmark-List.2436.0.html?'
				if pu_type == 'cpu'
				else
			'https://www.notebookcheck.net/Mobile-Graphics-Cards-Benchmark-List.844.0.html' 
		)
		resp=requests.post(search_url,data={
			'search':identifier,
			'or':0,
			f'{pu_type}_fullname':1,
		})
		def get_child(node,index):
			return next(itertools.islice(node.children,index,index+1))
		page=BeautifulSoup(resp.text,'html5lib')
		table=page.find(id='sortierbare_tabelle')
		tbody = get_child(table,0)
		for tr in tbody.children:
			if type(tr)==NavigableString:
				continue
			if len(list(tr.children))>=3:
				td = get_child(tr,2)
				a_tag=td.find('a')
				if a_tag!=None:
					return self.extract_pu_data(a_tag.attrs['href'])
		raise Exception("Failed to find link in search results")
	def extract_pu_data(self,url):
		resp=requests.get(url)
		page=BeautifulSoup(resp.text,'html5lib')
		table=page.find(class_='gputable')
		tbody=table.find('tbody')
		data={}
		for row in tbody.children:
			caption,content=list(row.children)
			content_str=str(content.text).split(' document.write')[0]
			caption_str=str(caption.text)
			if caption_str.startswith('Series') or len(caption_str)==0:
				continue
			data[caption_str]=content_str
		single_benchmarks=page.find(class_='gpusingle_benchmarks').find_all(class_='gpubench_div')
		benchmarks_data={}
		for benchmark in single_benchmarks:
			benchmark_data={}
			name=str(benchmark.find(class_='gpubench_benchmark').text)
			benchmark_time=benchmark.find(style='clear:both;').find(class_='paintAB_legend')
			children=list(benchmark_time.children)
			if len(children)==2:
				benchmark_data['min']=benchmark_data['avg']=benchmark_data['median']=benchmark_data['max']=float(str(children[0].text).split(' ')[0])
			else:
				matches = re.findall(r'([a-z]+):\s([0-9]+(?:.[0-9]+)?)',str(benchmark_time.text))
				for k,v in matches:
					benchmark_data[k]=float(v)	
			benchmarks_data[name]=benchmark_data
		data['bench']=benchmarks_data
		return data

		
	
	

	
def ksp_laptop_results_iter(results):
	for item in results['result']['items']:
		print('fetching laptop')
		# yield KspLaptopResult(item['uin'])
		yield KspLaptopResult(item['uin'])
# with open('page.txt', "w") as f:
#    json.dump(fetch_page(0),f)
# exit(0)
# with open('page.txt', "rb") as f:
#     results=json.load(f)
items = []
try:
	try:
		for page_num in range(1):
			page = fetch_page(0)
			item_list=ksp_laptop_results_iter(page)
			new_items = list(item_list)
			items+=new_items
			print('finished fetching page, amount of laptops in page:',len(new_items),', total amount of laptops:',len(items))
	except Exception as e:
		print('error:')
		print(e)
		print()
		print()
except KeyboardInterrupt:
	pass
print('opening file')
with open('laptops.json','w') as f:
	print('writing to file')
	f.write(jsonpickle.encode(items,unpicklable=False))
	print('successfully written to file')
