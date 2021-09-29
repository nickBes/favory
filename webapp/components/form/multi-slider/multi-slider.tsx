import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react'
import Bone from './bone'
import Joint from './joint'
import {ArrowContainer, Popover} from 'react-tiny-popover';
import Tooltip from '../tooltip'
/*
 * inputs:
 * min, max, amount of bones, input names, tooltips on bones, tooltip on joints, marks: number[]
 *
 * value - size of each bone, between to the min and max values
 * 
 */

interface MultiSliderProps {
	min: number,
	max: number,
	bonesAmount: number,
	inputNames: string[],
	minDistanceInPixelsBetweenJoints: number,
	// boneWidth is between 0 and 1
	boneTooltipsRenderer?: (boneIndex: number, boneWidth: number) => JSX.Element,
	isHidden: boolean,
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

const MultiSlider: React.FC<MultiSliderProps> = ({min, max, bonesAmount, inputNames, minDistanceInPixelsBetweenJoints, boneTooltipsRenderer, isHidden}) => {
	const emptyRect = {x: 0, y: 0, width: 0, height: 0}

	const containerRef = useRef<HTMLDivElement>(null)
	const [currentRect, setCurrentRect] = useState(emptyRect)

	// the widths of the bones in values between 0 and 1
	const [boneWidths, setBoneWidths] = useState([] as number[])

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

	useLayoutEffect(() => {
		updateCurrentRect();
		window.addEventListener('resize', updateCurrentRect);
		return () => {
			window.removeEventListener('resize', updateCurrentRect);
		}
	}, [containerRef])

	useLayoutEffect(() => {
		updateCurrentRect();
	}, [isHidden, containerRef])

	useEffect(() => {
		// generate initial bone widths, where all bones have the same width
		setBoneWidths(new Array(bonesAmount).fill(1 / bonesAmount))
	}, [min, max, bonesAmount])

	function renderBones() {
		let accumulatedWidth = 0;
		return boneWidths.map((boneWidth, boneIndex) => {
			const distanceFromStart = accumulatedWidth;
			accumulatedWidth += boneWidth;
			const boneCenterDistanceFromStart = distanceFromStart + boneWidth / 2;

			const boneElement = (<Bone
				inputName={boneIndex < inputNames.length ? inputNames[boneIndex] : undefined}
				width={boneWidth * currentRect.width}
				key={boneIndex} />);
			// if this bone has a tooltip
			if (boneTooltipsRenderer !== undefined) {
				return (
					<div key={boneIndex}>
						<Tooltip position="top" distanceFromLeft={boneCenterDistanceFromStart * currentRect.width}
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

	function handleJointDrag(index: number, {x}: MouseEvent) {
		const mouseDistanceFromStartPixels = x - currentRect.x

		// from 0 to 1
		const mouseDistanceFromStart = clamp(mouseDistanceFromStartPixels / currentRect.width, 0, 1)

		const minDistanceBetweenJoints = minDistanceInPixelsBetweenJoints / currentRect.width;

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
			return (
				<Joint
					distanceFromStart={accumulatedWidth * currentRect.width}
					onDrag={
						(event) => handleJointDrag(index, event)
					}
					key={index} />
			)
		})
	}

	return (
		<div ref={containerRef} style={
			{
				display: 'flex',
				maxWidth: 500,
				minHeight: 10,
				position: 'relative',
				flexDirection: 'row-reverse'
			}
		}>
			{renderBones()}
			{renderJoints()}
		</div>
	)
}
export default MultiSlider
