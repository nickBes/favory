import React, { useState, useEffect, useRef } from 'react'
import 'rc-slider/assets/index.css'
import { Range } from 'rc-slider'
import Tooltip from './tooltip'

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
    const rangeRef = useRef<HTMLDivElement>(null)
    const [rangeWidth, setRangeWidth] = useState(0)
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

    useEffect(() => {
        setRangeWidth(rangeRef.current?.clientWidth ?? 0)
    }, [rangeRef])

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

    const createTooltipFromCategoryAndSliderValues = (categoryAndSliderValues : CategoryAndSliderValues, max : number, min: number, rangeWidth: number) => {
        const values = categoryAndSliderValues.values
        let tooltipList = []
        let top = true
        const tags = Object.keys(categoryAndSliderValues.categories)
        for (let i = 1; i < values.length; i++) {
            tooltipList.push(<Tooltip 
                                    content={`${tags[i - 1]} ${Math.floor(100 * (values[i] - values[i - 1])/(max-min))}%`} 
                                    distanceFromLeft={(values[i] + values[i - 1])/((max - min) * 2) * rangeWidth}
                                    position={top ? 'top' : 'bottom'}
                                    key={i}>
                            </Tooltip>)
            top = !top
        }
        return tooltipList
    }

    return (
        <>
            <div ref={rangeRef} style={{
                            maxWidth: 700,
                            position: 'relative'
                        }}>
                <Range onChange={handleSliderChange}
                        value={categoryAndSliderValues.values.slice(1, categoryAndSliderValues.values.length - 1)} 
                        allowCross={false}
                        pushable={true}
                />
                {createTooltipFromCategoryAndSliderValues(categoryAndSliderValues, max, min, rangeWidth)}
            </div>
            {/* Range doesn't create ibputs, so we need to create them ourselves as
                the values are passed with a <form> */}
            {createInputsFromCategoryValues(categoryAndSliderValues.categories)}
        </>
    )
}

export default MultiSlider