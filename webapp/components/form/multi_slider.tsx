import React, { useState, useEffect } from 'react'
import 'rc-slider/assets/index.css'
import { Range } from 'rc-slider'

interface MultiSliderProps {
    tags: string[],
    min: number,
    max: number,
}

type CategoryScoreMap = {[category: string]: number}

interface CategoryAndSliderValues {
    categories: CategoryScoreMap
    values: number[]
}

const MultiSlider : React.FC<MultiSliderProps> = ({tags, min, max}) => {

    // use state is only called once, to update the categoryAndSliderValues so we need to use useEffect
    // that is called when tags are changed
    const [categoryAndSliderValues, setcategoryAndSliderValues] = useState<CategoryAndSliderValues>({categories: {}, values: []})
    useEffect(() => {
        const generateDefaultValues = () => {
            let defaultValues = new Array<number>()
            let step = (max - min) / (tags.length)
            let categories : CategoryScoreMap = {}
            tags.forEach(element => {
                categories[element] = step;
            })
            for (let count = step; count < max; count += step) {
                defaultValues.push(count)
            }
            const categoryAndSliderValues : CategoryAndSliderValues = {categories: categories, values: [min, ...defaultValues, max]} 
            return categoryAndSliderValues
        }
        setcategoryAndSliderValues(generateDefaultValues())
    }, [tags, min, max])

    const handleSliderChange = (values : number[]) => {
        setcategoryAndSliderValues(prev => {
            const nextValues = [min, ...values, max]
            let categoryValues : number[] = []
            for (let i = 1; i < nextValues.length; i++) {
                categoryValues.push(nextValues[i] - nextValues[i - 1])
            }
            const tags = Object.keys(prev.categories)
            const categories : CategoryScoreMap = {}
            for (let i = 0; i < tags.length; i++) {
                categories[tags[i]] = categoryValues[i]
            }
            return {categories: categories, values: nextValues}       
        })
    }

    const createInputsFromCategoryValues = (categoryValues : CategoryScoreMap) => {
        let inputList = []
        const style : React.CSSProperties = {
            display: 'none'
        }
        for (const tag in categoryValues) {
            inputList.push(<input key={tag} name={tag} value={categoryValues[tag]} style={style} readOnly={true}/>)
        }
        return inputList
    }

    return (
        <>
            <p>{JSON.stringify(categoryAndSliderValues)}</p>
            <Range onChange={handleSliderChange}
                    value={categoryAndSliderValues.values.slice(1, categoryAndSliderValues.values.length - 1)} 
                    allowCross={false}
                    pushable={true}
            />
            {/* Range doesn't create ibputs, so we need to create them ourselves as
                the values are passed with a <form> */}
            {createInputsFromCategoryValues(categoryAndSliderValues.categories)}
        </>
    )
}

export default MultiSlider