import React from 'react'
import styles from './collapse.module.scss'

export type CollapseUrlObject = {[title: string]: string}

interface CollapseProps {
    isActive: boolean,
    collapseUrlObject: CollapseUrlObject
}

const Collapse : React.FC <CollapseProps> = ({isActive, collapseUrlObject}) => {
    const createList = () => {
        return Object.keys(collapseUrlObject).map(title => <li><a href={collapseUrlObject[title]}>{title}</a></li>)
    }
    return (
        <div className={`${styles.collapse} ${isActive ? styles.isActive : undefined}`}>
            <ul>
                {/* <li><a href="./about">About</a></li>
                <li><a href="./team">Our team</a></li>
                <li><a href="./goals">Our goals</a></li>
                <li><a href="./contact">Contact us</a></li> */}
                {createList()}
            </ul>
        </div>
    )
}

export default Collapse;