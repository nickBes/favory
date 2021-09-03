import React from 'react'
import Navbar from '@/components/navbar/navbar'

const Goals : React.FC = () => {
    return (
        <>
            <Navbar collapseUrlObject={{
                'Home': './',
                'About': './about',
                'Our team': './team',
                'Contact us': './contact'
            }}></Navbar>
            <h1>What’s in store?</h1>
            <p>As of today, we plan on expending our services beyond (places) and support more languages to help more and more people over the world enjoy a convenient shopping experience, as well as adding more kinds of products other than laptops, which are just as confusing to purchase (e.g., headphones, vacuums, PCs).</p>
            <p>As time moves on, we might add new goals if we see it necessary.</p>
        </>
    )
}

export default Goals