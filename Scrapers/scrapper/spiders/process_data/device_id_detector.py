import re

ASCII_MAX = 128

# when detecting the id, these words can occur everywhere, even after the id, and these words
# are just added to the final id string, and ignored from the structure calculation.
NON_MEANINGFULL_WORDS = set([
    'pro',
    'threadripper',
    'embedded',
    'ii',
    'ultra'
])

# regex for detecting apple m1 gpus
APPLE_M1_GPU_RE = re.compile('[0-9]+-( )?core GPU')

# this is a set of words that are counted as part of the device id even though they appear after 
# a word with digits and contain letters only.
ALLOWED_WORDS_IN_DEVICE_ID_AFTER_DIGITS = set([
    'Ti'
])

class DeviceIdBuilder:
    def __init__(self) -> None:
        self.id = ''
    def add_word(self, word:str)->None:
        # if the id contains previous words, we should add a space before adding the new word
        if len(self.id)>0:
            self.id += ' '
        self.id += word

def word_contains_digits(word:str)->bool:
    return any([c.isdigit() for c in word])

def _detect_id(device_description:str)->str:
    # sometimes the combination of hebrew and english makes it so that the parentheses
    # move to the start of the string, so remove them from the string.
    if device_description[0] == '(':
        device_description = device_description[1:]

    # remove all non-ascii chars
    valid_chars = [c for c in device_description if ord(c)<ASCII_MAX]
    device_description = ''.join(valid_chars)

    # read all letters, digits, spaces and '-'s until we encounter any other character
    letters_digits_spaces = ''
    for c in device_description:
        if c == ' ' or c == '-' or c.isalnum():
            letters_digits_spaces+=c
        else:
            break

    # the id is always a word that contains digits, and might span across multiple
    # words. so we read all words until we encounter a word that contains both letters and digits,
    # and from there we only continue reading words that also contain boeth letters and digits.
    found_first_id_word = False
    id_builder = DeviceIdBuilder()
    for word in letters_digits_spaces.split(' '):
        if word in NON_MEANINGFULL_WORDS:
            id_builder.add_word(word)
            continue
        
        cur_word_contains_digits = word_contains_digits(word)
        if cur_word_contains_digits:
            found_first_id_word = True
        
        # if we have already encountered the first id word that contains digits, and we
        # find a word that is non-id after it, then this word is probably not part of the id
        if found_first_id_word and not cur_word_contains_digits:
            break

        id_builder.add_word(word)

    result = id_builder.id

    # in the ivory website they write the nvidia gpus with the 'Ti' right after the number,
    # without a space separating them, but in notebookcheck.com there is a space between the
    # number and the 'Ti', so we should add it.
    if result.endswith('Ti'):
        result = result[:-2] + ' Ti'

    return result

def detect_cpu_id(cpu_description:str)->str:
    return _detect_id(cpu_description)

def detect_gpu_id(gpu_description:str, cpu_description:str)->str:
    # apple M1 gpus have a very weird format that does not work with the _detect_id function, 
    # so this specialized case is used.
    if cpu_description.startswith('Apple M1') and APPLE_M1_GPU_RE.match(gpu_description):
        # the cores amount is always the first word
        cores_amount = gpu_description.split(' ')[0]
        # the cores amount contains a '-' character and optionally the string 'cores', but we 
        # only want the part before the '-'
        cores_amount = cores_amount.split('-')[0]

        return 'Apple M1 %s'%(cores_amount)
    return _detect_id(gpu_description)
        

    