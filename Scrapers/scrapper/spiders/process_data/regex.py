import re

PRICE_REGEX = re.compile('[0-9]+(?:,[0-9]+)?')
RAM_REGEX = re.compile('[0-9]+GB')
WEIGHT_REGEX = re.compile('[0-9]+(?:[.][0-9]+)?')
DEVICE_WORD_WITH_MISSING_SPACE_REGEX = re.compile('([A-Z][a-z]+)([0-9])')

