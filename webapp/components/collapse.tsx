import React from 'react'
import styles from '../styles/collapse.module.scss'

interface Props {
    isActive: boolean;
}

const Collapse : React.FC <Props> = ({isActive}) => {
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