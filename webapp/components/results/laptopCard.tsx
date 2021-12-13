import React from 'react'
import {SelectedLaptop} from '@/server/selector'
import { matchCategoriesToCategoryMap , defaultCategoryMap} from '@/server/categories'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'

interface LaptopCardProps extends SelectedLaptop{
	categories: string[]
}

const LaptopCard: React.FC<LaptopCardProps> = ({name, price, url, imageUrls, score, scoresInCategories, categories}) => {
	return (
		<>
			<figure className={styles.laptopCard}>
				<figcaption className={styles.laptopCardText}>
					<h1>{name}</h1>
					<p>מחיר: {price} ש&quot;ח</p>
					<p>ציון: {Math.round(score)}</p>
					<a href={url}><button>צפה</button></a>
					{matchCategoriesToCategoryMap(categories, defaultCategoryMap, (category, categoryData, __) => {
						if (category in scoresInCategories) { 
							return (<p>{categoryData.title}: {Math.round(scoresInCategories[category] * 100)}%</p>)
						}
					})}
				</figcaption>
				<div className={styles.laptopImage}><LaptopImages imageUrls={imageUrls} /></div>
			</figure>
		</>
	)
}

export default LaptopCard
