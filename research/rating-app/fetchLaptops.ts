import {Laptop} from "./components/sortable";

export default function fetchLaptops(): Laptop[]{
	let fakeLaptops = []
	for(let i = 0; i < 10; i++){
		fakeLaptops.push({
			id: i,
			name: `laptop ${i}`
		})
	}
    return fakeLaptops
}
