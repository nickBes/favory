import React from 'react'
import styles from './categoryScore.module.scss'


interface CategoryScoreProps {
    name: string
    score: number
    color?: string
}

const CategoryScore: React.FC<CategoryScoreProps> = ({name, score, color}) => {
    return (
        <div className={styles.categoryScoreWrapper}>
            <div style={{
                backgroundImage: `conic-gradient(${color ?? '#ffffff'} ${score}%, #e4e4e4 ${score}%)`,
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div className={styles.categoryScoreContent}>
                    <h3>{name}</h3>
                    <div>{score}%</div>
                </div>
            </div>
        </div>
    )
}

export default CategoryScore