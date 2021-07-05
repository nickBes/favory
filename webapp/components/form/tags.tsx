import React, { useState } from 'react'
import styles from '../../styles/form/tags.module.scss'

interface TagProps {
    setTags : (tags : string[]) => void
    tags : string[]
    inputName : string
}

const Tags : React.FC <{tagProps : TagProps}> = ({tagProps}) => {
    const removeTag = (index: number) => {
        tagProps.setTags(tagProps.tags.filter((_, i) => i != index))
    }

    return (
        <div>
            <ul>
                {tagProps.tags.map((tag, index) => (
                    <li key={index}>
                        <span onClick={() => removeTag(index)}>{tag}</span>
                        <input value={tag} name={tagProps.inputName} className={styles.hiddenInput} readOnly/>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default Tags