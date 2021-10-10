import React from 'react'
import {SelectedLaptop} from 'selector';
import LaptopCard from './laptopCard';
import styles from './laptop_list.module.scss'
import Cookies from 'js-cookie';

export type ClickedPopup = 'true' | 'false'

interface LaptopResultsListProps {
	laptops: SelectedLaptop[]
	displayPopup: boolean
}

const LaptopResultsList: React.FC<LaptopResultsListProps> = ({laptops, displayPopup}) => {
	return (

		<>
			
			{displayPopup ? <div  className={styles.laptopCard}><figure><h1 style={{lineHeight: '55px'}}>נשמח אם תענו על הסקר <a onClick={() => Cookies.set('clickedPopup', 'true', {path:'/results'})} 
			href='https://docs.google.com/forms/d/e/1FAIpQLSeOFRwkxqDLHSrSqW0qFpobOPEsl4qnsswWHocAtnljVW-Efg/viewform?usp=sf_link'>הזה :)</a></h1></figure></div> : ''}
			{
				laptops.map((laptop, index) => {
					return (
						<div key={index} className={styles.laptopCard}>
							<figure >
								<LaptopCard {...laptop} />
							</figure>
						</div>
					)
				})
			}
		</>
	)
}

export default LaptopResultsList
