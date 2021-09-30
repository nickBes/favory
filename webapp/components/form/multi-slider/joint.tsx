import React, {useEffect, useRef, useState} from 'react'
import Direction from './direction';

interface JointProps {
	direction: Direction,
	// the distance in pixels from the start of the slider
	distanceFromStart: number,
	onDrag: (event: MouseEvent) => void,
}

const Joint: React.FC<JointProps> = ({direction, distanceFromStart, onDrag}) => {
	const jointRef = useRef<HTMLDivElement>(null);
	const [isMouseDown, setIsMouseDown] = useState(false);

	function handleMouseMove(event: MouseEvent) {
		onDrag(event)
	}

	function handleMouseDown() {
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp)
		setIsMouseDown(true)
	}
	function handleMouseUp() {
		window.removeEventListener('mousemove', handleMouseMove);
		setIsMouseDown(false)
	}

	useEffect(() => {
		jointRef.current?.addEventListener('mousedown', handleMouseDown);
		if (isMouseDown) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp)
		}

		return () => {
			jointRef.current?.removeEventListener('mousedown', handleMouseDown);
			if (isMouseDown) {
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('mousemove', handleMouseMove);
			}
		}
	})
	return (
		<div ref={jointRef} style={
			{
				display: 'block',
				width: 15,
				height: 15,
				position: 'absolute',
				[direction == 'horizontal' ? 'left' : 'top']: distanceFromStart,
				[direction == 'horizontal' ? 'top' : 'left']: '50%',
				transform: 'translate(-50%, -50%)',
				backgroundColor: 'blue',
				userSelect: 'none'
			}
		}>
		</div>
	)
}

export default Joint;
