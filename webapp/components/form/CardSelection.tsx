import React, { useRef } from 'react'
import styles from './card-selection.module.scss'
import { CategoryMap, matchCategoriesToCategoryMap } from '@/server/categories'
import Card, { CardClickCallback } from './card'


interface CardSelectionProps {
    categoryMap: CategoryMap,
    categories: string[]
    onCardClick: CardClickCallback
    toolTipBoundaryElement: React.RefObject<HTMLElement>
}

const CardSelection : React.FC<CardSelectionProps> = ({categoryMap, categories, onCardClick, toolTipBoundaryElement}) => {
    return (
        <div className={styles.cardSelection}>
            {matchCategoriesToCategoryMap(categories, categoryMap, (category, categoryData, index) => {
                return (
                    <Card category={category}
                            title={categoryData.title} 
                            image={categoryData.image} 
                            description={categoryData.description} 
                            onCardClick={onCardClick}
                            key={index}
                            toolTipBoundaryElement={toolTipBoundaryElement}>
                    </Card>
                )
            })}
        </div>
    )
}
export default CardSelection
