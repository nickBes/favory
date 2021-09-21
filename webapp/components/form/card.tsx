import React, {useState} from 'react'
import styles from './card.module.scss'
import Image from 'next/image'

export interface CategoryData {
    title : string,
    description: string,
    image: StaticImageData
}

export type CardClickCallback = (category : string) => void

interface CardProps extends CategoryData {
    category: string,
    onCardClick: CardClickCallback
}

const Card : React.FC<CardProps> = ({category, title, description, image, onCardClick}) => {
    const [isActive, setIsActive] = useState(false)
    const updateActivity = () => {
        setIsActive(prevIsActive => !prevIsActive)
        onCardClick(category)
    }
    return (
        <div className={`${styles.cardWrapper} ${isActive ? styles.activeCardWrapper : ''}`} >
            <figure onClick={updateActivity} className={styles.card}>
                <div className={styles.cardIcon}><Image src={image} alt={title}></Image></div>
                <div><figcaption>{title}</figcaption></div>
                {/* Debug purposes before designing */}
                {/* <p>{isActive ? 'active' : 'not'}</p> */}
                {/* will add a tooltip instead of the description */}
                {/* <p>{description}</p> */}
            </figure>
        </div>
    )
}

export default Card
