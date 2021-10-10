import React, {useEffect, useRef, useState} from 'react'
import Direction from './direction';
import styles from './joint.module.scss'


interface JointProps {
	direction: Direction,
	// the distance in pixels from the start of the slider
	distanceFromStart: number,
	onDrag: (event: {x:number, y: number}) => void,
}

const Joint: React.FC<JointProps> = ({direction, distanceFromStart, onDrag}) => {
	const jointRef = useRef<HTMLDivElement>(null);
	const [isMouseDown, setIsMouseDown] = useState(false);
	const [isMouseDragging, setisMouseDragging] = useState(false);

	function handleAnyMove(){
		setisMouseDragging(true)
		document.body.style.cursor = 'grabbing'
	}

	function handleMouseMove(event: MouseEvent) {
		handleAnyMove();
		onDrag(event)
	}

	function handleTouchMove(event: TouchEvent) {
		handleAnyMove();
		onDrag({x: event.touches[0].pageX, y: event.touches[0].pageY})
	}

	function handleMouseDown(event: Event) {
		// in case of a touch event, prevent it from scrolling.
		event.preventDefault();

		window.addEventListener('mouseup', handleMouseUp);
		window.addEventListener('touchend', handleMouseUp);

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('touchmove', handleTouchMove);

		setIsMouseDown(true)
	}
	function handleMouseUp() {
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('touchmove', handleTouchMove);

		setisMouseDragging(false)
		setIsMouseDown(false)

		document.body.style.cursor = 'auto'
	}

	useEffect(() => {
		const cur = jointRef.current
		cur?.addEventListener('mousedown', handleMouseDown);
		cur?.addEventListener('touchstart', handleMouseDown);

		window.addEventListener('mouseup', handleMouseUp)
		window.addEventListener('touchend', handleMouseUp)

		if (isMouseDown) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('touchmove', handleTouchMove);
		}

		return () => {
			cur?.removeEventListener('mousedown', handleMouseDown);
			cur?.removeEventListener('touchstart', handleMouseDown);

			if (isMouseDown) {
				window.removeEventListener('mouseup', handleMouseUp);
				window.removeEventListener('touchend', handleMouseUp);

				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('touchmove', handleTouchMove);
			}
		}
	})
	return (
		<div ref={jointRef} className={`${styles.joint} ${isMouseDown || isMouseDragging ? styles.activeJoint : ''}`} style={
			{
				display: 'block',
				width: direction == 'horizontal' ? 25 : 35,
				height: direction == 'horizontal' ? 25 : 35,
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
