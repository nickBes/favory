import React from "react"
import { ReactSortable } from "react-sortablejs"
import LaptopCard from "@/components/laptop-card"

export interface Laptop {
    id: number
    name: string
}

interface SortableProps {
    laptopList : Laptop[]
    setLaptops : (newState : Laptop[]) => void
}

const Sortable : React.FC<SortableProps> = ({laptopList, setLaptops}) => {
    return (
        <ReactSortable className="flex flex-col w-11/12 lg:w-1/2 gap-4" swapThreshold={1} list={laptopList} setList={setLaptops} animation={200} ghostClass="invisible" dragClass="opacity-100">
            {laptopList.map((laptop, index) => (
                <LaptopCard title={laptop.name} key={index}/>
            ))}
        </ReactSortable>
    )
}

export default Sortable