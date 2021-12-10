import React from 'react'
import {SelectedLaptop} from '@/server/selector'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'

const LaptopCard: React.FC<SelectedLaptop> = ({name, price, url, imageUrls, score, scoresInCategories}) => {
	return (
		<>
			<figure className={styles.laptopCard}>
				<figcaption className={styles.laptopCardText}>
					<h1>{name}</h1>
					<p>מחיר: {price} ש&quot;ח</p>
					<p>ציון: {Math.round(score)}</p>
					<a href={url}><button>צפה</button></a>
					{console.log(scoresInCategories)}
				</figcaption>
				<div className={styles.laptopImage}><LaptopImages imageUrls={imageUrls} /></div>
			</figure>
		</>
	)
}

export default LaptopCard
