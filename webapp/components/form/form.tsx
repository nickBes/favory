import React from 'react'

interface FormAttr {
    action : string
    method : string
}

const Form : React.FC<{formAttr: FormAttr}> = ({formAttr, children}) => {
    return (
        <form action={formAttr.action} method={formAttr.method}>
            {children}
        </form>
    )
}

export default Form;