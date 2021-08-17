import React, { useState } from 'react'
import styles from './tags.module.scss'

interface TagProps {
    tags : string[]
    onTagClick : (value : string) => void
}

const Tags : React.FC <TagProps> = ({tags, onTagClick}) => {
    return (
        <div>
            <ul>
                {Array.from(tags).map((tag, index) => (
                    <li key={index}>
                        <span onClick={() => onTagClick(tag)}>{tag}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Tags