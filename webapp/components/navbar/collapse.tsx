import React from 'react'
import styles from './collapse.module.scss'

// represents a mapping of urls to titles that will be used in the
// Collapse component menu
type CollapseUrlObject = {[title: string]: string}

const globalCollapseUrlObject : CollapseUrlObject = {
    '/': 'Home',
    '/about': 'About',
    '/goals': 'Our goals',
    '/team': 'Our team',
    '/contact': 'Contact us'
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
        return Object.keys(collapseUrlObject).map((url, index) => <li key={index}><a href={url}>{collapseUrlObject[url]}</a></li>)
    }
    return (
        <div className={`${styles.collapse} ${isActive ? styles.isActive : undefined}`}>
            <ul>
                {createList()}
            </ul>
        </div>
    )
}

export default Collapse;