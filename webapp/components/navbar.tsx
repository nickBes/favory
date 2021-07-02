import React, {useState} from 'react'
import Burger from './burger'
import Collapse from './collapse'
import styles from '../styles/navbar.module.scss'

const Navbar : React.FC = () => {
    const [isActive, setActive] = useState(false)

    const toggleClass = () => {
        setActive(!isActive)
    }

    return (
        <div className={styles.wrap}>
            <nav className={styles.navbar}>
                <h1 className={isActive ? 'isActive' : undefined}>Favory</h1>
                <Burger toggleClass={toggleClass} isActive={isActive}></Burger>
            </nav>
            <Collapse isActive={isActive}></Collapse>
        </div>
    )
}

export default Navbar;