import React from 'react'

interface CategoryScoreProps {
    name: string
    score: number
    color: string
}

const CategoryScore: React.FC<CategoryScoreProps> = ({name, score, color}) => {
    return (
        <div>
            <h1>{name}</h1>
            <div style={{}}>
                <div>{score}</div>
            </div>
        </div>
    )
}

export default CategoryScore