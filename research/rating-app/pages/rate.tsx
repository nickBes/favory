import React, { useState } from "react"
import { ReactSortable } from "react-sortablejs"

interface Laptop {
    id: number
    name: string
}

const count = 20
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
        <ReactSortable className="flex flex-col" list={laptopList} setList={setLaptopList} animation={200} ghostClass="bg-rose-500">
            {laptopList.map(laptop => (
                <div className="border-2 border-indigo-500" key={laptop.id}>{laptop.name}</div>
            ))}
        </ReactSortable>
    )
}

export default RatingPage