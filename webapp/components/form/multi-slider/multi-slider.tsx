import React, {useEffect, useRef, useState} from 'react'
import Bone from './bone'
import Joint from './joint'
import Tooltip from '../tooltip'
import Direction from './direction'
import styles from './multi-slider.module.scss'
import { PopoverPosition } from 'react-tiny-popover'

interface MultiSliderProps {
	min: number,
	max: number,
	bonesAmount: number,
	inputNames: string[],
	colors: (string | undefined)[],
	minDistanceInPixelsBetweenJoints: number,
	// boneWidth is between 0 and 1
	boneTooltipsRenderer?: (boneIndex: number, boneWidth: number) => JSX.Element,
	jointTooltipsRenderer?: (jointIndex: number, distanceFromStart: number) => JSX.Element,
	direction: Direction,
}

function clamp(value: number, min: number, max: number): number {
	if (value < min) {
		return min;
	} else if (value > max) {
		return max;
	} else {
		return value;
	}
}

const MultiSlider: React.FC<MultiSliderProps> = ({
	min,
	max,
	bonesAmount,
	inputNames,
	colors,
	minDistanceInPixelsBetweenJoints,
	boneTooltipsRenderer,
	jointTooltipsRenderer,
	direction
}) => {
	const valuesRange = max-min;

	const emptyRect = {x: 0, y: 0, width: 0, height: 0}

	const containerRef = useRef<HTMLDivElement>(null)
	const [currentRect, setCurrentRect] = useState(emptyRect)

	// the widths of the bones in values between 0 and 1
	const [boneWidths, setBoneWidths] = useState([] as number[])

	const generateDefaultWidths = () => setBoneWidths(new Array(bonesAmount).fill(1 / bonesAmount))

	// use effect is only after render so when rendering after bones amount has changed
	// we will try to render bones that don't exist anymore which cause an error
	// this somehow prevents by waiting for the next update if the bones widths are not updated
	if (bonesAmount != boneWidths.length) {
		generateDefaultWidths()
		return <></>
	}

	const updateCurrentRect = () => {
		if (containerRef.current == null) {
			return;
		}
		const rect = containerRef.current.getBoundingClientRect();
		setCurrentRect({
			x: rect.x,
			y: rect.y,
			width: rect.width,
			height: rect.height,
		})
	}

	// returns the currentRect's width or height, according to to the 
	// direction property
	function getLength():number{
		return direction=='horizontal'?currentRect.width:currentRect.height
	}

	useEffect(() => {
		updateCurrentRect();
		window.addEventListener('resize', updateCurrentRect);
		return () => {
			window.removeEventListener('resize', updateCurrentRect);
		}
	}, [containerRef])

	useEffect(() => {
		console.log('bones amount use effect', bonesAmount)
		updateCurrentRect();
		// generate initial bone widths, where all bones have the same width
		generateDefaultWidths()
	}, [min, max, bonesAmount])

	function renderBones() {
		let accumulatedWidth = 0;
		const positions : PopoverPosition[] = direction == 'horizontal' ? ['top', 'bottom'] : ['left', 'right']
		let firstPosition = true
		console.log('boneWidths', boneWidths)
		return boneWidths.map((boneWidth, boneIndex) => {
			const distanceFromStart = accumulatedWidth;
			accumulatedWidth += boneWidth;
			const position = firstPosition ? positions[0] : positions[1]
			firstPosition = !firstPosition
			const boneCenterDistanceFromStart = distanceFromStart + boneWidth / 2;

			const boneElement = (<Bone
				inputName={boneIndex < inputNames.length ? inputNames[boneIndex] : undefined}
				color={boneIndex < colors.length ? colors[boneIndex] : undefined}
				direction={direction}
				sizeInPixels={boneWidth * getLength()}
				widthAsValue={boneWidth * valuesRange}
				key={boneIndex} />);
			if (boneTooltipsRenderer !== undefined) {
				return (
					<div key={boneIndex}>
						<Tooltip direction={direction} position={position} distanceFromStart={boneCenterDistanceFromStart * getLength()}
							content={boneTooltipsRenderer(boneIndex, boneWidth)} />
						{boneElement}
					</div>)
			} else {
				return boneElement
			}
		})
	}

	// returns a value from 0 to 1
	function getBoneEnd(index: number): number {
		if (index < 0) {
			return 0;
		}
		if (index >= bonesAmount) {
			return 1;
		}
		return boneWidths.slice(0, index + 1).reduce((total, cur) => total + cur)
	}

	function handleJointDrag(index: number, {x,y}: MouseEvent) {
		const rect = containerRef.current?.getBoundingClientRect();
		if (rect === undefined) {
			return;
		}

		const rectOffset = direction=='horizontal'?rect.x:rect.y;
		const rectLength = direction=='horizontal'?rect.width:rect.height;
		const mouseOffset = direction=='horizontal'?x:y;

		const mouseDistanceFromStartPixels = mouseOffset-rectOffset

		// from 0 to 1
		const mouseDistanceFromStart = clamp(mouseDistanceFromStartPixels / rectLength, 0, 1)

		const minDistanceBetweenJoints = minDistanceInPixelsBetweenJoints / rectLength;

		const prevBoneEnd = getBoneEnd(index - 1);
		const nextBoneEnd = getBoneEnd(index + 1);

		let newCurBoneEnd = mouseDistanceFromStart;

		if (newCurBoneEnd - prevBoneEnd < minDistanceBetweenJoints) {
			newCurBoneEnd = prevBoneEnd + minDistanceBetweenJoints;
		}
		if (nextBoneEnd - newCurBoneEnd < minDistanceBetweenJoints) {
			newCurBoneEnd = nextBoneEnd - minDistanceBetweenJoints;
		}

		setBoneWidths(prev => {
			let newWidths = [...prev];
			newWidths[index] = newCurBoneEnd - prevBoneEnd;
			newWidths[index + 1] = nextBoneEnd - newCurBoneEnd;
			return newWidths
		})
	}

	function renderJoints() {
		let accumulatedWidth = 0;

		// the amount of handles is 1 less than the amount of bones, thus the slice
		return boneWidths.slice(0, boneWidths.length - 1).map((boneWidth, index) => {
			accumulatedWidth += boneWidth;
			const jointElement = (
				<Joint
					direction={direction}
					distanceFromStart={accumulatedWidth * getLength()}
					onDrag={
						(event) => handleJointDrag(index, event)
					}
					key={index} />
			)
			if (jointTooltipsRenderer !== undefined) {
				return (
					<div key={index}>
						<Tooltip direction={direction} position={direction=='horizontal'?"top":"left"} distanceFromStart={accumulatedWidth * getLength()}
							content={jointTooltipsRenderer(index, accumulatedWidth)} />
						{jointElement}
					</div>)
			} else {
				return jointElement
			}
		})
	}
	{console.log('bones', bonesAmount)}
	return (
		<div className={styles.multiSliderWrapper}>
			<div ref={containerRef} className={direction=='horizontal' ? styles.horizontalSlider : styles.verticalSlider}>
				{renderBones()}
			</div>
			{renderJoints()}
		</div>

	)
}
export default MultiSlider