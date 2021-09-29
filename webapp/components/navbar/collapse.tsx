import React from 'react'
import styles from './collapse.module.scss'
import Link from 'next/link'

// represents a mapping of urls to titles that will be used in the
// Collapse component menu
type CollapseUrlObject = {[title: string]: string}

const globalCollapseUrlObject : CollapseUrlObject = {
    '/': 'ראשי',
    '/about': 'אודות',
    '/why-us': 'למה אנחנו',
    '/contact': 'צרו קשר'
}

interface CollapseProps {
    isActive: boolean,
    exclude: string
}

const Collapse : React.FC <CollapseProps> = ({isActive, exclude}) => {
    const createCollapseUrlObject = (exclude : string) => {
        let collapseUrlObject = {...globalCollapseUrlObject}
        delete collapseUrlObject[exclude]
        return collapseUrlObject
    }

    const createList = () => {
        const collapseUrlObject = createCollapseUrlObject(exclude)
        return Object.keys(collapseUrlObject).map((url, index) => <li key={index}><Link href={url}>{collapseUrlObject[url]}</Link></li>)
    }
    return (
        <div className={`${styles.collapse} ${isActive ? styles.isActive : undefined}`}>
            <menu>
                {createList()}
            </menu>
        </div>
    )
}

export default Collapse;