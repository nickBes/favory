import React, {useState} from 'react'
import Burger from './burger'
import Collapse, {CollapseUrlObject} from './collapse'
import styles from './navbar.module.scss'

interface NavbarProps {
    collapseUrlObject: CollapseUrlObject
}

const Navbar : React.FC<NavbarProps> = ({collapseUrlObject}) => {
    const [isActive, setActive] = useState(false)

    const toggleIsActive = () => setActive(!isActive)
    return (
        <div className={styles.navbarWrap}>
            <nav className={styles.navbar}>
                <h1>favory</h1>
                <Burger toggleIsActive={toggleIsActive} isActive={isActive}></Burger>
            </nav>
            <Collapse collapseUrlObject={collapseUrlObject} isActive={isActive}></Collapse>
        </div>
    )
}

export default Navbar;