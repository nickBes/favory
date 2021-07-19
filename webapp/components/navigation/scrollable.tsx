import React from 'react'
import styles from '../../styles/navigation/scrollable.module.scss'

interface ScrollableProps {
    direction? : string
}

const Scrollable : React.FC <ScrollableProps> = ({children, direction}) => {
    const scrollClassByDirection = () => {
        let className = styles.scrollable_v
        if (direction) {
            if (direction.toLowerCase() === 'horizontal') {
                className = styles.scrollable_h
            }
        }
        return className
    }

    const wrapClassByDirection = () => {
        let className = styles.scrollableWrap_v
        if (direction) {
            if (direction.toLowerCase() === 'horizontal') {
                className = styles.scrollableWrap_h
            }
        }
        return className
    }

    return (
        <div className={wrapClassByDirection()}>
            <div className={scrollClassByDirection()}>
                {children}
            </div>
        </div>
    )
}

export default Scrollable