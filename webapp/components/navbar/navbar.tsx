import React, {useState} from 'react'
import Burger from './burger'
import Collapse from './collapse'
import styles from './navbar.module.scss'
import Link from 'next/link'

interface NavbarProps {
    path: string
}

const Navbar : React.FC<NavbarProps> = ({path}) => {
    const [isActive, setActive] = useState(false)
    const toggleIsActive = () => setActive(!isActive)
    return (
        <div className={styles.navbarWrap}>
            <nav className={styles.navbar}>
                <h1><Link href='/'>favory</Link></h1>
                <Burger toggleIsActive={toggleIsActive} isActive={isActive}></Burger>
            </nav>
            <Collapse exclude={path} isActive={isActive}></Collapse>
        </div>
    )
}

export default Navbar;