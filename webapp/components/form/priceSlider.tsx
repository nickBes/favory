import React from 'react'
import MultiSlider from './multi-slider/multi-slider'

interface PriceSliderProps {
	max: number,
	min: number,
}

const PriceSlider: React.FC<PriceSliderProps> = ({max, min}) => {
	return (
		<MultiSlider
			min={min}
			max={max}
			direction="horizontal"
			colors={["blue", "white"]}
			inputNames={["maxPrice"]}
			bonesAmount={2}
			minDistanceInPixelsBetweenJoints={0}
			jointTooltipsRenderer={
				(_index, _dis, value) => {
					return (<>{value.toFixed(0)}</>)
				}
			}
		/>
	)
}

export default PriceSlider
