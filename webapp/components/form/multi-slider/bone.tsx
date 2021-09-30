import React from "react"
import Direction from "./direction";

interface BoneProps {
	inputName?: string,
	direction: Direction,
	// size in pixels.
	// represents the width or height of the Bone, depending on the `direction` property
	sizeInPixels: number,

	// the width of the bone, converted to the range between min and max,
	// thus representing the bone's value
	widthAsValue: number,
	color?:string
}

const defaultColor = '#868686'

const Bone: React.FC<BoneProps> = ({inputName, direction, sizeInPixels, widthAsValue, color}) => {
	let style: React.CSSProperties = {
		backgroundColor: color ?? defaultColor,
	}
	if (direction == 'horizontal') {
		style.width = sizeInPixels;
		style.height = 10;
	} else {
		style.height = sizeInPixels;
		style.width = 10;
	}
	return (
		<div style={style}>
			{
				(inputName !== undefined) ? (<input type="hidden" name={inputName} value={widthAsValue} />) : null
			}
		</div>
	)
}

export default Bone
