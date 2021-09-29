import React from "react"
import Direction from "./direction";

interface BoneProps {
	inputName?: string,
	direction: Direction,
	// size in pixels.
	// represents the width or height of the Bone, depending on the `direction` property
	size: number,
}

const Bone: React.FC<BoneProps> = ({inputName, direction, size}) => {
	let style: React.CSSProperties = {
		backgroundColor: 'red',
	}
	if (direction == 'horizontal') {
		style.width = size;
		style.height = 10;
	} else {
		style.height = size;
		style.width = 10;
	}
	return (
		<div style={style}>
		</div>
	)
}

export default Bone
