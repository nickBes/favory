import React from 'react'
import {SelectedLaptop} from 'selector'

const LaptopCard: React.FC<SelectedLaptop> = ({name, price, cpu, gpu, score}) => {
	return (<>
		<ul>
			<li>Name: {name}</li>
			<li>Price: {price}</li>
			<li>Cpu: {cpu}</li>
			<li>Gpu: {gpu}</li>
			<li>Score: {score}</li>
		</ul>
	</>)
}

export default LaptopCard
