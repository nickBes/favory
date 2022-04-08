import React from "react"

interface LaptopCardProps {
    title:string
}

const LaptopCard : React.FC<LaptopCardProps> = ({title}) => {
    return (
        <figure className="flex bg-slate-100 items-center">
            <img className="w-60 h-auto" src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg"/>
            <figcaption className="mx-auto text-center">
                <header className="text-6xl">{title}</header>
            </figcaption>
        </figure>
    )
}

export default LaptopCard