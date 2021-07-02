import React from 'react'
import styles from '../styles/scrollable.module.scss'

const Scrollable : React.FC = ({children}) => {
    return (
        <div className={styles.wrap}>
            <div className={styles.scrollable}>
                {children}
            </div>
        </div>
    )
}

export default Scrollable;