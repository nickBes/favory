import React from 'react'
import Card, { CategoryData, CardClick } from './card'

export type CategoryMap = {[category: string]: CategoryData}

interface CardSelectionProps {
    categoryMap: CategoryMap,
    categories: string[]
    onCardClick: CardClick
}

const CardSelection : React.FC<CardSelectionProps> = ({categoryMap, categories, onCardClick}) => {
    return (
        <div>
            {categories.map((category, index) => {
            if (categoryMap[category]) {
                return (
                <Card category={category}
                        title={categoryMap[category].title} 
                        image={categoryMap[category].image} 
                        description={categoryMap[category].description} 
                        onCardClick={onCardClick}
                        key={index}>
                </Card>
                )
            }
            })}
        </div>
    )
}
export default CardSelection