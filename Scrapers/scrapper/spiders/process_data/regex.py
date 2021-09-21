import re

PRICE_REGEX = re.compile('[0-9]+(?:,[0-9]+)?')
RAM_REGEX = re.compile('[0-9]+GB')
WEIGHT_REGEX = re.compile('[0-9]+(?:[.][0-9]+)?')

