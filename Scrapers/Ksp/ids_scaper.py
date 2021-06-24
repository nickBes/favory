import requests
import io
import re
import json
import os
from dataclasses import dataclass
from bs4 import BeautifulSoup,NavigableString

url='https://www.notebookcheck.net/Laptop_Search.8223.0.html'
page_file_path='www.notebookcheck.net.html'
def fetch_page():
	if os.path.exists(page_file_path) and os.path.isfile(page_file_path):
		with open(page_file_path,'rb') as f:
			return f.read().decode()
	content = requests.get(url).content
	with open(page_file_path,'wb') as f:
		f.write(content)
	return content.decode()

values_name='hdds'
name_attribute='hdd_type'
values={}
values_bs=BeautifulSoup(fetch_page(),'html5lib').find('select',{'name':name_attribute})
for c in values_bs:
	v=c.get('value')
	if len(v)>0:
		values[c.text.lower()]=v.lower()
with open(values_name+'_ids.json','w') as f:
	json.dump(values,f)
