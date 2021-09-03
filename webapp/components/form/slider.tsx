import React, { useState } from 'react'

interface SliderProps {
    inputName : string
    defaultValue : number
    min : number
    max : number
    onSliderChange? : (value : number) => void
}

const Slider : React.FC<SliderProps> = ({inputName, defaultValue, min, max, onSliderChange}) => {
    const [inputValue, setInputValue] = useState(defaultValue)

    // for each given input update the inputValue state
    const updateInputValue = (value : string) => {
        setInputValue(() => {
            // input values are always strings
            let convertedValue = parseFloat(value)
            if (convertedValue === NaN) {
                convertedValue = defaultValue
                console.warn('Wrong value has been passed to the slider.')
                return defaultValue
            }
            if (onSliderChange !== undefined) {
                onSliderChange(convertedValue)
            }
            return convertedValue
        })
    }

    return (
        <>
            {/* Debug purposes */}
            <p>{inputName}: {inputValue}</p>
            <input name={inputName} type='range' min={min} max={max} value={inputValue} onChange={event => updateInputValue(event.target.value)}/>
        </>
    )
}
export default Slider