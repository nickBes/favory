import React from "react"

interface ButtonProps {
    onClick? : () => void
}

const Button : React.FC<ButtonProps> = ({children, onClick}) => {
    return (
        <button onClick={() => onClick ? onClick() : ''}
                className="bg-sky-500
                            hover:bg-sky-600 
                            text-slate-100
                            p-4
                            text-2xl
                            rounded-xl
                            focus:outline-none
                            focus:ring
                            focus:ring-sky-200
                            font-medium">
            {children}
        </button>
    )
}

export default Button