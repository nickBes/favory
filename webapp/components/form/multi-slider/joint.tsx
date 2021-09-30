import React, {useEffect, useRef, useState} from 'react'
import Direction from './direction';
import styles from './joint.module.scss'


interface JointProps {
	direction: Direction,
	// the distance in pixels from the start of the slider
	distanceFromStart: number,
	onDrag: (event: MouseEvent) => void,
}

const Joint: React.FC<JointProps> = ({direction, distanceFromStart, onDrag}) => {
	const jointRef = useRef<HTMLDivElement>(null);
	const [isMouseDown, setIsMouseDown] = useState(false);
	const [isMouseDragging, setisMouseDragging] = useState(false);

	function handleMouseMove(event: MouseEvent) {
		onDrag(event)
		setisMouseDragging(true)
		document.body.style.cursor = 'grabbing'
	}

	function handleMouseDown() {
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp)
		setIsMouseDown(true)
	}
	function handleMouseUp() {
		window.removeEventListener('mousemove', handleMouseMove);
		setisMouseDragging(false)
		setIsMouseDown(false)
		document.body.style.cursor = 'auto'
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
	console.log(isMouseDragging)
	return (
		<div ref={jointRef} className={`${styles.joint} ${isMouseDown || isMouseDragging ? styles.activeJoint : ''}`} style={
			{
				display: 'block',
				width: 25,
				height: 25,
				position: 'absolute',
				[direction == 'horizontal' ? 'left' : 'top']: distanceFromStart,
				[direction == 'horizontal' ? 'top' : 'left']: '50%',
				transform: 'translate(-50%, -50%)',
				userSelect: 'none'
			}
		}>
		</div>
	)
}

export default Joint;
