import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'

const Contact : React.FC = () => {
    const router = useRouter()
    return (
        <article>
            <Navbar path={router.pathname}></Navbar>
            <h1>Contact us</h1>
            <a href='' onClick={() => {navigator.clipboard.writeText('favory.contact@gmail.com')}}>favory.contact@gmail.com</a>
        </article>
    )
}

export default Contact