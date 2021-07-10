import React, { useState } from 'react'

interface SliderProps {
    inputName : string
    defaultValue : number
    min : number
    max : number
    onChange? : (value : number) => void
}

const Slider : React.FC<{sliderProps : SliderProps}> = ({sliderProps}) => {
    const [inputValue, setInputValue] = useState(sliderProps.defaultValue)
    const updateInputValue = (value : string) => {
        let convertedValue = parseFloat(value)
        if (convertedValue === NaN) {
            convertedValue = sliderProps.defaultValue
            console.warn('Wrong value has been passed to the slider.')
        }
        if (sliderProps.onChange !== undefined) {
            sliderProps.onChange(convertedValue)
        }
        setInputValue(convertedValue)
    }

    return (
        <>
            {/* This headline is for debug. */}
            <h1>{sliderProps.inputName}: {inputValue}</h1>
            <input name={sliderProps.inputName} type='range' min={sliderProps.min} max={sliderProps.max} value={inputValue} onChange={event => updateInputValue(event.target.value)}/>
        </>
    )
}
export default Slider