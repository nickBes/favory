import React, { useState } from 'react'

interface SearchBarProps {
    suggestions : Set<string>
    onClick : (value : string) => void
    maxListSize : number
}

const SearchBar : React.FC<{searchBarProps : SearchBarProps}> = ({searchBarProps}) => {
    const [filteredData, setFilteredData] = useState(new Set<string>())

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

    const filterData = (value : string) => {
        let tmpFilteredData = new Set<string>()
        // if the input value 
        if (value) {
            // create a new set from the existing suggestion and remove 
            // all of the items that don't include the input value
            tmpFilteredData = new Set(searchBarProps.suggestions)
            tmpFilteredData.forEach(suggestion => {
                if (!suggestion.includes(value)) {
                    tmpFilteredData.delete(suggestion)
                }
            })

            // sort the set by longest string occurence of the input value
            tmpFilteredData = new Set(Array.from(tmpFilteredData).sort((left, right) => {
                let [r, l] = [maxStringOccuranceLength(right, value), maxStringOccuranceLength(left, value)]
                return r - l
            }))
        }
        setFilteredData(tmpFilteredData)
    }

    const createList = (filteredData : Set<string>) => {
        return Array.from(filteredData).splice(0, searchBarProps.maxListSize).map(suggestion => {
            return (
                <li key={suggestion} onClick={() => searchBarProps.onClick(suggestion)}>{suggestion}</li>
            )
        })
    }

    return (
        <>
            <input key={searchBarProps.suggestions.size} type='text' onChange={event => filterData(event.target.value.toLowerCase())}></input>
            {(() => {
                if (filterData.length != 0) {
                    return (
                        <ul>
                            {createList(filteredData)}
                        </ul>
                    )
                }
            })()}
        </>
    )
}

export default SearchBar