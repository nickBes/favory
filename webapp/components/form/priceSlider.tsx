import React, {useState} from 'react'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

interface PriceSliderProps {
	max: number,
	min: number,
	defaultValue: number
}

const PriceSlider: React.FC<PriceSliderProps> = ({max, min, defaultValue}) => {
	const [userSelectedMaxPrice, setUserSelectedMaxPrice] = useState(defaultValue)
	function handleSliderChange(value: number) {
		setUserSelectedMaxPrice(value)
	}
	return (
		<>
			<Slider onChange={handleSliderChange} max={max} min={min} defaultValue={defaultValue} reverse={true}/>
			<input type="hidden" name="maxPrice" value={userSelectedMaxPrice} readOnly={true} />
		</>
	)
}

export default PriceSlider
