import React, { useState } from "react"
import Sortable, { Laptop } from "@/components/sortable"
import Button from "@/components/utils/button"
import axios from "axios"
import useSWR from "swr"

const count = 5
let laptops : Laptop[] = []

for (let i = 0; i < count; i++) {
    laptops.push({
        id: i,
        name: `laptop ${i}`
    })
}

// parses laptops into sendable array and posts it to the api
// returns the api's data response
const postMethod = async (url : string, laptops : Laptop[]) => {
    const laptopIDs = laptops.map(laptop => laptop.id)
    return (await axios.post(url, laptopIDs)).data
}

const RatingPage : React.FC = () => {
    const [laptopList, setLaptopList] = useState(laptops)
    const [shouldSend, setShouldSend] = useState(false)
    // will use the post method if should send data
    const { data, error } = useSWR(shouldSend ? "/api/post-rating" : null, (url) => postMethod(url, laptopList))
    
    return (
        <main className="container mx-auto flex flex-col items-center gap-6 p-4">
            <Sortable laptopList={laptopList} setLaptops={setLaptopList}/>
            <Button onClick={() => setShouldSend(true)}>Submit</Button>
            {data ? console.log(`Data from server-\n${data}`) : ''}
            {console.log(error)}
        </main>
    )
}

export default RatingPage