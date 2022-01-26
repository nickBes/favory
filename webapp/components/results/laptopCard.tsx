import React, { useState } from 'react'
import {SelectedLaptop} from '@/server/selector'
import { matchCategoriesToCategoryMap , defaultCategoryMap} from '@/server/categories'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'
import CategoryScore from './categoryScore'

interface LaptopCardProps extends SelectedLaptop{
	categories: string[]
	open?: true
}

const LaptopCard: React.FC<LaptopCardProps> = ({name, price, url, imageUrls, open, scoresInCategories, categories, cpu, gpu}) => {
	const [clickedDesc, setClickedDesc] = useState(open === undefined ? false : true)

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
						<p>{price} ש&quot;ח</p>
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
						<div>
						<h1>מפרט טכני</h1>
						<table>
							<tr>
								<td>מעבד</td>
								<td>{cpu}</td>
							</tr>
							<tr>
								<td>כרטיס מסך</td>
								<td>{gpu}</td>
							</tr>
						</table>
					</div>
					</div>
				</div>
				<div className={styles.description} onClick={toggleDesc}>{clickedDesc ? 'סגור' : 'קרא עוד'}</div>
			</figure>
		</>
	)
}

export default LaptopCard
