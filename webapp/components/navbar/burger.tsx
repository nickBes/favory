import React from 'react'
import styles from '../../styles/navbar/burger.module.scss'

interface BurgerProps {
    isActive: boolean;
    toggleIsActive: () => void;
}

const Burger : React.FC <BurgerProps> = ({toggleIsActive, isActive}) => {
    return (
        <div onClick={toggleIsActive} className={styles.burgerWrap}>
            <div className={`${styles.burger} ${isActive ? styles.isActive : undefined}`}></div>
        </div>

    )
}

export default Burger;