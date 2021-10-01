import React from 'react'
import {SelectedLaptop} from 'selector';
import LaptopCard from './laptopCard';
import styles from './laptop_list.module.scss'

interface LaptopResultsListProps {
	laptops: SelectedLaptop[]
	displayPopup: boolean
}

const LaptopResultsList: React.FC<LaptopResultsListProps> = ({laptops, displayPopup}) => {
	return (

		<>
			{displayPopup ? <figure className={styles.laptopCard}><h1>נשמח אם תענו על הסקר <a href='https://forms.gle/oTP819QXDjNfKZLW8'>הבא :)</a></h1></figure> : ''}
			{
				laptops.map((laptop, index) => {
					return (
						<figure key={index} className={styles.laptopCard}>
							<LaptopCard {...laptop} />
						</figure>
					)
				})
			}
		</>
	)
}

export default LaptopResultsList
