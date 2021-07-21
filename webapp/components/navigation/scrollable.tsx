import React from 'react'
import styles from '../../styles/navigation/scrollable.module.scss'

interface ScrollableProps {
    direction : 'horizontal' | 'vertical'
}

const Scrollable : React.FC <ScrollableProps> = ({children, direction}) => {
    const getScrollClassByDirection = () => styles['scrollable_' + direction[0]]

    const getWrapClassByDirection = () => styles['scrollableWrap_' + direction[0]]

    return (
        <div className={getWrapClassByDirection()}>
            <div className={getScrollClassByDirection()}>
                {children}
            </div>
        </div>
    )
}

export default Scrollable