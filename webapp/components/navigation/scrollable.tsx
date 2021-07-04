import React from 'react'
import styles from '../../styles/navigation/scrollable.module.scss'

const Scrollable : React.FC = ({children}) => {
    return (
        <div className={styles.scrollableWrap}>
            <div className={styles.scrollable}>
                {children}
            </div>
        </div>
    )
}

export default Scrollable;