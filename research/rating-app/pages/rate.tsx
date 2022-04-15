import React, { useState } from "react"
import Sortable, { Laptop } from "@/components/sortable"
import Button from "@/components/utils/button"
import axios from "axios"

const count = 5
let laptops : Laptop[] = []

for (let i = 0; i < count; i++) {
    laptops.push({
        id: i,
        name: `laptop ${i}`
    })
}



const RatingPage : React.FC = () => {
    const [laptopList, setLaptopList] = useState(laptops)

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
            <Sortable laptopList={laptopList} setLaptops={setLaptopList}/>
            <Button onClick={postRatingAndGetNext}>Submit</Button>
        </main>
    )
}

export default RatingPage