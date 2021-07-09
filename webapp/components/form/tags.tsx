import React, { useState } from 'react'
import styles from '../../styles/form/tags.module.scss'

interface TagProps {
    tags : Set<string>
    onClick : (value : string) => void
}

const Tags : React.FC <{tagProps : TagProps}> = ({tagProps}) => {
    return (
        <div>
            <ul>
                {Array.from(tagProps.tags).map((tag, index) => (
                    <li key={index}>
                        <span onClick={() => tagProps.onClick(tag)}>{tag}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Tags