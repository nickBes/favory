import React, {useState, useEffect} from 'react'
import styles from './card.module.scss'
import Image from 'next/image'
import { Popover, ArrowContainer, PopoverPosition} from 'react-tiny-popover'

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
    const [isDescriptionOn, setIsDescriptionOn] = useState(false)
    const updateActivity = () => {
        setIsActive(prevIsActive => !prevIsActive)
        onCardClick(category)
    }
    const toggleDescription = () => setIsDescriptionOn(prev => !prev)
    return (
        <div className={`${styles.cardWrapper} ${isActive ? styles.activeCardWrapper : ''}`} >
            <Popover 
                isOpen={isDescriptionOn} 
                padding={10}
                onClickOutside={toggleDescription}
                content={({position, childRect, popoverRect}) => (
                    <ArrowContainer 
                        position={position}
                        childRect={childRect}
                        popoverRect={popoverRect}
                        arrowSize={10}
                        arrowColor='black'>
                        <div
                            style={{
                                backgroundColor: 'black',
                                textAlign: 'center',
                                color: 'white',
                                padding: 10,
                                borderRadius: 10,
                                maxWidth: 400,
                                direction: 'rtl'
                            }}>
                        {description}</div>
                    </ArrowContainer>
                )}>
                <div className={styles.descIconWrapper}><div className={`${styles.descIcon} ${isDescriptionOn ? styles.activeDesc : ''}`} onClick={toggleDescription}>?</div></div>
            </Popover>
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