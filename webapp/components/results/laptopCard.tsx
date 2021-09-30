import React from 'react'
import {SelectedLaptop} from 'selector'
import LaptopImages from './laptopImages'
import styles from './laptop_card.module.scss'

const LaptopCard: React.FC<SelectedLaptop> = ({name, price, url, imageUrls, score}) => {
	return (
		<>
			<figcaption>
				<h1>{name}</h1>
				<p>מחיר: {price} ש&quotח</p>
				<p>ציון: {Math.round(score)}</p>
				<a href={url}>צפה</a>
			</figcaption>
			<div className={styles.laptopImage}><LaptopImages imageUrls={imageUrls} /></div>
		</>
	)
}

export default LaptopCard
