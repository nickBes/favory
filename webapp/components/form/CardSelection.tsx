import React, { useRef } from 'react'
import styles from './card-selection.module.scss'
import Card, { CategoryData, CardClickCallback } from './card'

export type CategoryMap = {[category: string]: CategoryData}

interface CardSelectionProps {
    categoryMap: CategoryMap,
    categories: string[]
    onCardClick: CardClickCallback
    toolTipBoundaryElement: React.RefObject<HTMLElement>
}

const CardSelection : React.FC<CardSelectionProps> = ({categoryMap, categories, onCardClick, toolTipBoundaryElement}) => {
    return (
        <div className={styles.cardSelection}>
            {categories.map((category, index) => {
            // checkes whether category exists in the
            // category map as the category map is created manually
            if (categoryMap[category]) {
                return (
                <Card category={category}
                        title={categoryMap[category].title} 
                        image={categoryMap[category].image} 
                        description={categoryMap[category].description} 
                        onCardClick={onCardClick}
                        key={index}
                        toolTipBoundaryElement={toolTipBoundaryElement}>
                </Card>
                )
            }
            })}
        </div>
    )
}
export default CardSelection
