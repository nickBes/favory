import React, { useState } from 'react'
import {SelectedLaptop} from '@/server/selector'
import { matchCategoriesToCategoryMap , defaultCategoryMap} from '@/server/categories'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'
import CategoryScore from './categoryScore'

interface LaptopCardProps extends SelectedLaptop{
	categories: string[]
}

const LaptopCard: React.FC<LaptopCardProps> = ({name, price, url, imageUrls, score, scoresInCategories, categories}) => {
	const [clickedDesc, setClickedDesc] = useState(false)

	const toggleDesc = () => {
		setClickedDesc(prev => {
			return !prev
		})
	}

	return (
		<>
			<figure className={styles.laptopCard}>
				<div className={styles.mainCardInfo}> 
					<figcaption className={styles.laptopCardText}>
						<h1>{name}</h1>
						<p>מחיר: {price} ש&quot;ח</p>
						<p>ציון התאמה: {Math.round(score)}</p>
						<a href={url}><button>צפה</button></a>
					</figcaption>
					<div className={styles.laptopImage}><LaptopImages imageUrls={imageUrls} /></div>
				</div>
				<div style={{display: clickedDesc ? 'block' : 'none', width: '100%'}} >
					<div className={styles.informationWrapper}>
						<h1>ביצועים של המחשב בשימושים שנבחרו</h1>
						<div className={styles.information} >
							{matchCategoriesToCategoryMap(categories, defaultCategoryMap, (category, categoryData, index) => {
										if (category in scoresInCategories) { 
											return <CategoryScore key={index} color={categoryData.color} name={categoryData.title} score={Math.round(scoresInCategories[category] * 100)}/>
										}
							})}
						</div>
					</div>
				</div>
				<div className={styles.description} onClick={toggleDesc}>{clickedDesc ? 'סגור' : 'קרא עוד'}</div>
			</figure>
		</>
	)
}

export default LaptopCard
