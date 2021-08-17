import React from 'react'
import styles from './collapse.module.scss'

interface CollapseProps {
    isActive: boolean;
}

const Collapse : React.FC <CollapseProps> = ({isActive}) => {
    return (
        <div className={`${styles.collapse} ${isActive ? styles.isActive : undefined}`}>
            <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Our team</a></li>
                <li><a href="#">Our goals</a></li>
                <li><a href="#">Contact us</a></li>
            </ul>
        </div>
    )
}

export default Collapse;