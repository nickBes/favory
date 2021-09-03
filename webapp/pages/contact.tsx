import React from 'react'
import Navbar from '@/components/navbar/navbar'

const Contact : React.FC = () => {
    return (
        <>
            <Navbar collapseUrlObject={{
                'Home': './',
                'About': './about',
                'Our team': './team',
                'Our goals': './goals'
            }}></Navbar>
            <h1>Contact us</h1>
            <a href='' onClick={() => {navigator.clipboard.writeText('favory.contact@gmail.com')}}>favory.contact@gmail.com</a>
        </>
    )
}

export default Contact