import React, { useState } from "react"
import Sortable, { Laptop } from "@/components/sortable"
import Button from "@/components/utils/button"

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
    return (
        <main className="container mx-auto flex flex-col items-center gap-6 p-4">
            <Sortable laptopList={laptopList} setLaptops={setLaptopList}/>
            <Button onClick={() => console.log(laptopList)}>Submit</Button>
        </main>
    )
}

export default RatingPage