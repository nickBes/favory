import React, {useState} from 'react'
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
        <div onClick={updateActivity}>
            <Image src={image} alt={description}></Image>
            <h1>{title}</h1>
            {/* Debug purposes before designing */}
            <p>{isActive ? 'active' : 'not'}</p>
            <p>{description}</p>
        </div>
    )
}

export default Card
