import { NextApiHandler } from "next"

const initialLaptops : NextApiHandler = (req, res) => {
	// create a bunch of fake laptops. 
	// This is temporary, just for testing the api.
	let fakeLaptops = []
	for(let i = 0; i < 10; i++){
		fakeLaptops.push({
			id: i,
			name: `laptop ${i}`
		})
	}
	res.status(200).json(fakeLaptops)
}

export default initialLaptops
