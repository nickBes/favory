import React from 'react'
import Image from 'next/image'
import unhappyImage from '../../public/unhappy.jpg'
import styles from './error.module.scss'

const Error : React.FC = () => {
    return (
        <section>
            <div className={styles.errorImg}><Image src={unhappyImage} alt="Hank unhappy"></Image></div>
        </section>
    )
}

export default Error