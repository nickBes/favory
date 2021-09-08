import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'

const Team : React.FC = () => {
    const router = useRouter()
    return (
        <> 
            <Navbar path={router.pathname}></Navbar>
            <h1>Our team</h1>
            <p>Favory started as a small developing team consisting of 3 high school students from Israel.</p>
            <p>We felt as though purchasing computers and laptops was much more comlicated than it should have been, as many people don’t know how to decide between all the different options, getting confused by the odd technical descriptions and endless, meaningless data.</p>
            <p>We’ve decided to create a new, simple platform which not only will help make the purchasing experience easy to understand, but match the product to the user’s personal needs, with absolutely zero need for previous knowledge in computers or experience.</p>
        </>
    )
}

export default Team