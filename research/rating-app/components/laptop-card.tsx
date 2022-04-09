import React from "react"

interface LaptopCardProps {
    title:string
}

const LaptopCard : React.FC<LaptopCardProps> = ({title}) => {
    return (
        <figure className="md:flex bg-slate-100 items-center p-4 md:p-0">
            <img className="mx-auto md:mx-0 w-1/5 md:w-1/3 h-auto" src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg"/>
            <figcaption className="mx-auto text-center">
                <header className="text-3xl md:text-6xl">{title}</header>
            </figcaption>
        </figure>
    )
}

export default LaptopCard