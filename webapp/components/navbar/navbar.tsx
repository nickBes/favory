import React, {useState} from 'react'
import Burger from './burger'
import Collapse from './collapse'
import styles from '../../styles/navbar/navbar.module.scss'

const Navbar : React.FC = () => {
    const [isActive, setActive] = useState(false)

    const toggleIsActive = () => setActive(!isActive)
    return (
        <div className={styles.navbarWrap}>
            <nav className={styles.navbar}>
                <h1>favory</h1>
                <Burger toggleIsActive={toggleIsActive} isActive={isActive}></Burger>
            </nav>
            <Collapse isActive={isActive}></Collapse>
        </div>
    )
}

export default Navbar;