import React from 'react'
import {SelectedLaptop} from 'selector';
import LaptopCard from './laptopCard';

interface LaptopResultsListProps {
	laptops: SelectedLaptop[],
}

const LaptopResultsList: React.FC<LaptopResultsListProps> = ({laptops}) => {
	return (
		<ul>
			{
				laptops.map((laptop, index) => {
					return (
						<li key={index}>
							<LaptopCard {...laptop} />
						</li>
					)
				})
			}
		</ul>
	)
}

export default LaptopResultsList
