import React from 'react'
import { Popover, ArrowContainer, PopoverPosition} from 'react-tiny-popover'
import Direction from './multi-slider/direction'

interface TooltipProps {
	direction: Direction,
    content: JSX.Element
    distanceFromStart: number
    position: PopoverPosition
}

const Tooltip : React.FC<TooltipProps> = ({content, distanceFromStart, position, direction}) => {
    return (
        <Popover 
            isOpen={true}
            align='center'
            positions={[position]}
            reposition={false}
            padding={10}
            content={({position, childRect, popoverRect}) => (
                <ArrowContainer position={position} childRect={childRect} popoverRect={popoverRect} arrowSize={10} arrowColor={'black'}>
                    <div style={{
                        backgroundColor:'black',
                        color: 'white',
                        padding: 10,
                        borderRadius: 10
                    }}>{content}</div>
                </ArrowContainer>
        )}>
            <div style={{
                visibility: 'hidden',
                position: 'absolute',
                [direction=='horizontal'?'left':'top']: distanceFromStart,
                [direction=='horizontal'?'top':'left']: '50%',
                transform: 'translate(-50%, -50%)'
            }}></div>
    </Popover>
    )
}

export default Tooltip
