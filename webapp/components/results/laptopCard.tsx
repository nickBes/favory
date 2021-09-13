import React from 'react'
import {SelectedLaptopInfo} from 'selector'

const LaptopCard: React.FC<SelectedLaptopInfo> = ({name, price, cpu, gpu}) => {
	return (<>
		<ul>
			<li>Name: {name}</li>
			<li>Price: {price}</li>
			<li>Cpu: {cpu}</li>
			<li>Gpu: {gpu}</li>
		</ul>
	</>)
}

export default LaptopCard
