import React from 'react'
import Image from 'next/image'
import unhappyImage from '../../public/unhappy.jpg'
import styles from './error.module.scss'

interface ErrorProps {
    message: string
}

const Error : React.FC<ErrorProps> = ({message}) => {
    return (
        <figure className={styles.errorFigure}>
            <div className={styles.errorImg}><Image src={unhappyImage} alt="Hank unhappy"></Image></div>
            <figcaption>{message}</figcaption>
        </figure>
    )
}

export default Error