import React from 'react'
import { Popover, ArrowContainer, PopoverPosition} from 'react-tiny-popover'

interface TooltipProps {
    content: string
    distanceFromLeft: number
    position: PopoverPosition
}

const Tooltip : React.FC<TooltipProps> = ({content, distanceFromLeft, position}) => {
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
                left: distanceFromLeft,
                top: '50%',
                transform: 'translate(-50%, -50%)'
            }}></div>
    </Popover>
    )
}

export default Tooltip