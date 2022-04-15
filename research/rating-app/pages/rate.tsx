import React, {useEffect, useState} from "react"
import Sortable, {Laptop} from "@/components/sortable"
import Button from "@/components/utils/button"
import axios from "axios"

const RatingPage: React.FC = () => {
	const [laptopList, setLaptopList] = useState([] as Laptop[])

	useEffect(() => {
		async function loadInitialLaptops() {
			let initial_laptops = await axios.get('/api/initial_laptops').then(response => response.data as Laptop[])
			setLaptopList(initial_laptops)
		}
		loadInitialLaptops()
	}, [])

	const postRatingAndGetNext = async () => {
		// parse into array of ids
		const laptopIds = laptopList.map(laptop => laptop.id)
		// post the array of ids and manage cases
		let nextLaptopIds = await axios.post("/api/post-rating", laptopIds)
			.then(response => response.data as number[])


		if (nextLaptopIds) {
			// parsing laptop id's into a laptop array.
			// this is temporary untill our server is made
			// before we have real laptop data
			setLaptopList(nextLaptopIds.map(id => {
				return {
					id: id,
					name: `laptop ${id}`
				}
			}))
		}
	}


	return (
		<main className="container mx-auto flex flex-col items-center gap-6 p-4">
			<Sortable laptopList={laptopList} setLaptops={setLaptopList} />
			<Button onClick={postRatingAndGetNext}>Submit</Button>
		</main>
	)
}

export default RatingPage
