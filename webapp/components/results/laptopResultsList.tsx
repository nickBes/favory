import React from 'react'
import {SelectedLaptop} from 'selector';
import LaptopCard from './laptopCard';
import styles from './laptop_list.module.scss'

interface LaptopResultsListProps {
	laptops: SelectedLaptop[],
}

const LaptopResultsList: React.FC<LaptopResultsListProps> = ({laptops}) => {
	return (

		<>
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
