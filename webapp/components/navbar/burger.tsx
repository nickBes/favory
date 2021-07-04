import React from 'react'
import styles from '../../styles/navbar/burger.module.scss'

interface Props {
    isActive: boolean;
    toggleClass: () => void;
}

const Burger : React.FC <Props> = ({toggleClass, isActive}) => {
    return (
        <div onClick={toggleClass} className={styles.wrap}>
            <div className={`${styles.burger} ${isActive ? styles.isActive : undefined}`}></div>
        </div>

    )
}

export default Burger;