import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'

const About : React.FC = () => {
    const router = useRouter()
    return (
        <>    
            <Navbar path={router.pathname}></Navbar>
            <h1>About Favory</h1>
            <p>Our survey gathers the user’s personal preferences, as they’ve stated, regarding price, the intended uses and the importancy of each use to the person.</p>
            <p>Using a special algorithm we’ve created, all the traits are processed to find the best answer for those preferences. Laptops considered as qualified by the algorithm will be presented to the user, including the level of qualification for each laptop, as well as a detailed reasoning behind every rating.</p>
            <p>Each suggestion will provide a link leading directly to a site selling the item, for the customer’s convenience. Once the user decides, they will be able to check-out directly from the store they picked.</p>
            <p>After the item has arrived, we will be more than happy to know if you expectations have been met.</p>
        </>
    )
}

export default About