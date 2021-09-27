import React from 'react'
import {SelectedLaptop} from 'selector'
import LaptopImages from './laptopImages'

const LaptopCard: React.FC<SelectedLaptop> = ({name, price, cpu, gpu, score, imageUrls}) => {
	return (<ul>
		<li>Name: {name}</li>
		<li>Price: {price}</li>
		<li>Cpu: {cpu}</li>
		<li>Gpu: {gpu}</li>
		<li>Score: {score}</li>
		<LaptopImages imageUrls={imageUrls} />
	</ul>)
}

export default LaptopCard
