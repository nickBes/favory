import React from "react"

interface BoneProps {
	inputName?: string,
	// width in pixels
	width: number,
}

const Bone: React.FC<BoneProps> = ({inputName, width}) => {
	return (
		<div style={
			{
				width: width,
				height: 10,
				backgroundColor: `rgb(${Math.random() * 256}, ${Math.random() * 256}, ${Math.random() * 256})`,
			}
		}>
		</div>
	)
}

export default Bone
