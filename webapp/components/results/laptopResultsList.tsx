import React from 'react'
import {SelectedLaptopInfo} from 'selector';
import LaptopCard from './laptopCard';

interface LaptopResultsListProps {
	laptops: SelectedLaptopInfo[],
}

const LaptopResultsList: React.FC<LaptopResultsListProps> = ({laptops}) => {
	return (
		<ul>
			{
				laptops.map((laptop, index) => {
					return (
						<>
							<li key={index}>
								<LaptopCard {...laptop} />
							</li>
							<br />
						</>
					)
				})
			}
		</ul>
	)
}

export default LaptopResultsList
