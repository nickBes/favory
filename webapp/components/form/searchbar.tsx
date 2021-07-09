import React, { useState } from 'react'

interface SearchBarProps {
    suggestions : Set<string>,
    onClick : (value : string) => void
}

const SearchBar : React.FC<{searchBarProps : SearchBarProps}> = ({searchBarProps}) => {
    const [filteredData, setFilteredData] = useState(new Set<string>())

    const multiStringOccurance =  (base : string, other : string) => {
        const firstLetter = other[0]
        let indexes = [] as number[]
        base.split('').forEach((char, index) => {
            if (char == firstLetter) {
                indexes.push(index)
            }
        })
        if (indexes.length == 0) {
            return 0
        }
        let nums = new Array<number>(indexes.length).fill(0)
        nums.map((_, index) => {
            return stringOccuranceAtIndex(base, other, indexes[index])
        })
        return Math.max(...nums)
    }
    const stringOccuranceAtIndex = (base : string, other : string, index : number) => {
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
        console.log(searchBarProps.suggestions)
        let tmpFilteredData = new Set<string>()
        if (value) {
            tmpFilteredData = new Set(searchBarProps.suggestions)
            tmpFilteredData = new Set(Array.from(tmpFilteredData).filter(data => data.includes(value)))
            new Set(Array.from(tmpFilteredData).sort((left, right) => {
                let [r, l] = [multiStringOccurance(right, value), multiStringOccurance(left, value)]
                return r - l
            }))
        }
        setFilteredData(tmpFilteredData)
    }

    const createList = (filteredData : Set<string>) => {
        return Array.from(filteredData).map(suggestion => {
            return (
                <li key={suggestion} onClick={() => searchBarProps.onClick(suggestion)}>{suggestion}</li>
            )
        })
    }

    return (
        <>
            <input type='text' onChange={event => filterData(event.target.value.toLowerCase())}></input>
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