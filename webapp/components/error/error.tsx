import React from 'react'
import Image from 'next/image'
import unhappyImage from '../../public/unhappy.jpg'
import styles from '../../styles/error/error.module.scss'

const Error : React.FC = () => {
    return (
        <section>
            <Image src={unhappyImage} alt="Hank unhappy"></Image>
        </section>
    )
}

export default Error