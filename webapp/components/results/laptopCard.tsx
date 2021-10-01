import React from 'react'
import {SelectedLaptop} from 'selector'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'

const LaptopCard: React.FC<SelectedLaptop> = ({name, price, url, imageUrls, score}) => {
	return (
		<>
			<figcaption className={styles.laptopCardText}>
				<h1>{name}</h1>
				<p>מחיר: {price} ש"ח</p>
				<p>ציון: {Math.round(score)}</p>
				<a href={url}><button>צפה</button></a>
			</figcaption>
			<div className={styles.laptopImage}><LaptopImages imageUrls={imageUrls} /></div>
		</>
	)
}

export default LaptopCard
