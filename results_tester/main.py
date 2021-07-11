import requests
import json

RESULTS_URL = 'http://localhost:3000/results'
NEXT_DATA_TAG = '<script id="__NEXT_DATA__" type="application/json">'
NEXT_DATA_TAG_CLOSE = '</script>'

def extract_next_data(response_text: str):
    next_data_tag_index = response_text.find(NEXT_DATA_TAG)
    next_data_start = next_data_tag_index + len(NEXT_DATA_TAG)
    next_data_end = response_text.find(NEXT_DATA_TAG_CLOSE, next_data_start)
    return json.loads(response_text[next_data_start:next_data_end])

def build_request_data(category_scores, max_price = None):
    request_data = category_scores.copy()
    if max_price is not None:
        request_data['maxPrice'] = max_price
    return request_data

def get_results(request_data):
    resp = requests.post(RESULTS_URL, request_data)
    next_data = extract_next_data(resp.text)
    return next_data['props']['pageProps']['pageProps']

def main():
    while True:
        print('enter category scores:')
        print('example: design:1 gaming:5 dev:1.45 maxprice:1304.2')
        print()
        scores_string = input('>>> ')
        try:
            parsed_scores = {score.split(':')[0]:float(score.split(':')[1]) for score in scores_string.split(' ')}
        except:
            print('invalid input')
            continue
        max_price = None
        if 'maxprice' in parsed_scores:
            max_price = parsed_scores['maxprice']
        request_data = build_request_data(parsed_scores, max_price)
        print('sending request with data:')
        print(json.dumps(request_data, indent=4))
        print()
        results = get_results(request_data)
        print('results:')
        print(json.dumps(results, indent=4))
        print()

if __name__ == '__main__':
    main()