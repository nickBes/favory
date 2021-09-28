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
    // refrence of the actuall slider component
    const rangeRef = useRef<HTMLDivElement>(null)
    // using useState because we want the component to rerender when the width is changed
    const [rangeWidth, setRangeWidth] = useState(0)
    // use state is only called once, to update the categoryAndSliderValues so we need to use useEffect
    // that is called when tags are changed
    const [categoryAndSliderValues, setcategoryAndSliderValues] = useState<CategoryAndSliderValues>({categories: {}, values: []})


    useEffect(() => {
        setRangeWidth(rangeRef.current?.clientWidth ?? 0)
        const handleResize = () =>  setRangeWidth(rangeRef.current?.clientWidth ?? 0)
        window.addEventListener('resize', handleResize)
        // this cleanup functions ensures that the event listener above is added once
        return () => window.removeEventListener('resize', handleResize)
    })

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

    const createTooltipFromCategoryAndSliderValues = (categoryAndSliderValues : CategoryAndSliderValues, max : number, min: number, rangeWidth: number) => {
        const values = categoryAndSliderValues.values
        let tooltipList = []
        let top = true
        const tags = Object.keys(categoryAndSliderValues.categories)
        // we start from one because the difference between 2 values 
        // represents the actual category value
        for (let i = 1; i < values.length; i++) {
            const tag = tags[i - 1]
            const currentValue = values[i]
            const previousValue = values[i - 1]
            tooltipList.push(<Tooltip 
                                    // display the category and the percentage of the category
                                    content={`${tag} ${Math.floor(100 * (currentValue - previousValue)/(max-min))}%`} 
                                    // get the relative (to [max - min]) centred location between 2 values and multiply 
                                    // it by the width of the actuall slider to know how much to move from the left of
                                    // of the slider
                                    distanceFromLeft={(currentValue + previousValue)/((max - min) * 2) * rangeWidth}
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
                        // we need the min and max values in the array for calculations, but the slider 
                        // needs the values of the handles
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