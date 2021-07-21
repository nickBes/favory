import React, { useState } from 'react'

interface SearchBarProps {
    suggestions : string[]
    onSuggestionClick : (value : string) => void
    maxDisplayedSuggestions : number
}

const SearchBar : React.FC<SearchBarProps> = ({suggestions, onSuggestionClick, maxDisplayedSuggestions}) => {
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

    // will return the maximum string occurance length of the other's string
    // in the base string as there can be multiple string occurances
    const maxStringOccuranceLength =  (base : string, other : string) => {
        // searching for the indexes of the first char of the other string
        // in the base string and storing them in an array 
        const firstLetter = other[0]
        let indexes = [] as number[]
        base.split('').forEach((char, index) => {
            if (char == firstLetter) {
                indexes.push(index)
            }
        })
        // return length of 0 if no occurance was found
        if (indexes.length == 0) {
            return 0
        }
        // creating a number array that stores the occurance length of the other string
        // in the base string for each index and then returning the maximum occurance
        let nums = new Array<number>(indexes.length).fill(0)
        nums.map((_, index) => {
            return stringOccuranceLengthAtIndex(base, other, indexes[index])
        })
        return Math.max(...nums)
    }

    // return the string occurance length of the other string from the given index
    // in the base string
    const stringOccuranceLengthAtIndex = (base : string, other : string, index : number) => {
        // iteratates over the base string from the index parameter till the end of
        // the base/other string and if the char of the base string matches the char
        // of the other string increment num, if it doesn't the iteration stops
        let [num, idx] = [0, index]
        while (idx < base.length && num < other.length) {
            if (base[idx] == other[num]) {
                idx++
                num++
                continue
            }
            break
        }
        return num
    }

    // for a given input string filter the suggestions by thes tring occurance 
    // of the input field in each suggestion, from the longest to the shortest
    const filterSuggestions = (value : string) => {
        setFilteredSuggestions(() => {
            // check that the input string isn't empty
            if (value) {
                // remove all of the items that don't include the input value and sort 
                // the suggestions by the longest occurance of the input value
                return suggestions.filter(suggestion => suggestion.includes(value))
                                    .sort((left, right) => {
                                        let [rightSuggestionOccuranceLength, leftSuggestionOccuranceLength] = [maxStringOccuranceLength(right, value), 
                                                                                                                maxStringOccuranceLength(left, value)]
                                        // if the the input value's occurance is longer in the right suggestion it will return
                                        // a positive number and the right and left suggestions will switch in places, else
                                        // it will return either 0 or a negative number and the locations won't changes
                                        return rightSuggestionOccuranceLength - leftSuggestionOccuranceLength
                                    })
            }
            return []
        })
    }

    // return an array of <li> that represent each suggestion in the filtered order 
    const createSuggestionsItems = (filteredSuggestion : string[]) => {
        return filteredSuggestion.slice(0, maxDisplayedSuggestions).map(suggestion => {
            return (
                <li key={suggestion} onClick={() => onSuggestionClick(suggestion)}>{suggestion}</li>
            )
        })
    }

    // if the there are suggestions returns a list of suggestions
    const createSuggestionsList = (filteredSuggestions : string[]) => {
        if (filterSuggestions.length != 0) {
            return (
                <ul>
                    {createSuggestionsItems(filteredSuggestions)}
                </ul>
            )
        }
        return <></>
    }

    return (
        <>
            {/* Converting the input's value to lower case to make the filtering algorithm case insensitive*/}
            <input key={suggestions.length} type='text' onChange={event => filterSuggestions(event.target.value.toLowerCase())}></input>
            {createSuggestionsList(filteredSuggestions)}
        </>
    )
}

export default SearchBar