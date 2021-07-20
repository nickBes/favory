import React, { useState } from 'react'

interface SliderProps {
    inputName : string
    defaultValue : number
    min : number
    max : number
    onChange? : (value : number) => void
}

const Slider : React.FC<SliderProps> = ({inputName, defaultValue, min, max, onChange}) => {
    const [inputValue, setInputValue] = useState(defaultValue)
    const updateInputValue = (value : string) => {
        let convertedValue = parseFloat(value)
        if (convertedValue === NaN) {
            convertedValue = defaultValue
            console.warn('Wrong value has been passed to the slider.')
        }
        if (onChange !== undefined) {
            onChange(convertedValue)
        }
        setInputValue(convertedValue)
    }

    return (
        <>
            {/* This headline is for debug. */}
            <h1>{inputName}: {inputValue}</h1>
            <input name={inputName} type='range' min={min} max={max} value={inputValue} onChange={event => updateInputValue(event.target.value)}/>
        </>
    )
}
export default Slider