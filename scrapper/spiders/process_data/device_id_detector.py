import re

from spiders.process_data.regex import RAM_REGEX

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

# words that are just removed from a cpu's name before starting to detect the id
CPU_REMOVED_WORDS = set([
    'processor'
])

# regex for detecting apple m1 gpus
APPLE_M1_GPU_RE = re.compile('([0-9]+)[-]?[ ]?[Cc]ore GPU')

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

def _detect_id(device_description:str, removed_words: set = set())->str:
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

        if word.lower() in removed_words:
            # if the word is a removed word, just don't include it in the id
            # and ignore it completely
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

    # in the lastprice website, the string 'A4' is added to some amd devices when
    # it is not part of the device id, so remove it.
    if 'AMD A4 ' in result:
        result = result.replace('AMD A4 ', 'AMD ')

    return result

def detect_cpu_id(cpu_description:str)->str:
    # special case for the apple m1 cpu
    if cpu_description == 'M1':
        return 'Apple M1'

    # for some reason some cpu names start with this word, and it messes the notebookcheck search,
    # so remove it
    if cpu_description.startswith('Dual '):
        cpu_description = cpu_description[len('Dual '):]

    return _detect_id(cpu_description, CPU_REMOVED_WORDS)

def detect_gpu_id(gpu_description:str, cpu_description:str)->str:
    # apple M1 gpus have a very weird format that does not work with the _detect_id function, 
    # so this specialized case is used.
    if cpu_description.startswith('Apple M1') or cpu_description == 'M1':
        match = APPLE_M1_GPU_RE.fullmatch(gpu_description)
        cores_amount = match.group(1)

        return 'Apple M1 %s'%(cores_amount)

    # for some gpus, the amount of ram the gpu has is included in its in its name.
    # it is usually added at the end, after the actual name of the gpu, so we should
    # find where the ram pattern is found, and take everything before it.
    ram_match = RAM_REGEX.search(gpu_description)
    if ram_match != None:
         gpu_description = gpu_description[:ram_match.start(0)]

    # sometimes the word GTX is used without a space after it which ruins the search 
    # in notebookecheck
    gpu_description.replace('GTX','GTX ')


    return _detect_id(gpu_description)

def is_integrated_gpu(gpu_description:str)->bool:
    '''
    checks if the given gpu description is of an integrated gpu.
    the check is currently very simple, but seems to work for all known examples.
    '''

    return 'Graphics' in gpu_description

def detect_pu_ids_in_laptop_data(laptop_data):
    '''
    Reads the cpu and gpu info from the laptop, extracts their device ids,
    and stores the ids back to the laptop_data. Also adds an 'integrated' field
    to the laptop data the determines whether the gpu is an integrated gpu or not
    '''
    # detecting device's ids that are relevant to notebookcheck
    # there might be a better way of accessing these parameters
    # using map functionalities, but for now it'll do the work

    # if the device has no gpu, it probably has an integrated gpu
    if 'gpu' not in laptop_data:
        laptop_data['integrated'] = True
    else:
        gpu_id = detect_gpu_id(laptop_data['gpu'], laptop_data['cpu'])
        laptop_data['gpu'] = gpu_id
        laptop_data['integrated'] = is_integrated_gpu(gpu_id)
    laptop_data['cpu'] = detect_cpu_id(laptop_data['cpu'])

