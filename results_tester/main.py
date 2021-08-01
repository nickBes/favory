import requests
import json

RESULTS_URL = 'http://localhost:3000/results'
# the tag that contains the next data, which contains the page props
NEXT_DATA_TAG = '<script id="__NEXT_DATA__" type="application/json">'
# the tag closing the tag described above
NEXT_DATA_TAG_CLOSE = '</script>'

# extract the next data from the next data tag, and parses it (json)
def extract_next_data(response_text: str):
    next_data_tag_index = response_text.find(NEXT_DATA_TAG)
    next_data_start = next_data_tag_index + len(NEXT_DATA_TAG)
    next_data_end = response_text.find(NEXT_DATA_TAG_CLOSE, next_data_start)
    return json.loads(response_text[next_data_start:next_data_end])

# builds a selection request object given the selection parameters. note that max_price is optional.
def build_request_data(category_scores, max_price = None):
    # create a new object containing all category scores, and if a max price was specified add it
    # as a field of this object
    request_data = category_scores.copy()
    if max_price is not None:
        request_data['maxPrice'] = max_price
    return request_data

# gets the selection results be sending a selection request to the webapp and extracting the
# page props from it
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
            # each `score` represents a string of the form 'design:1', we split it by ':' to get
            # the name and the score. we create a dictionary mapping the name, which is 
            # score.split(':'), to the user selected score, which is score.split(':') and is
            # converted to a float using float()
            parsed_scores = {score.split(':')[0]:float(score.split(':')[1]) for score in scores_string.split(' ')}
        except:
            print('invalid input')
            continue
        max_price = None
        # if a max price was specified, extract it from the scores, so that they will only represent
        # the category scores
        if 'maxprice' in parsed_scores:
            max_price = parsed_scores['maxprice']
            del parsed_scores['maxprice']
        # build request data according to the user selected category scores and max price
        request_data = build_request_data(parsed_scores, max_price)
        print('sending request with data:')
        print(json.dumps(request_data, indent=4))
        print()
        # get the selection results
        results = get_results(request_data)
        print('results:')
        print(json.dumps(results, indent=4))
        print()

if __name__ == '__main__':
    main()