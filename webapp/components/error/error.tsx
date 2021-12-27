import React from 'react'
import Image from 'next/image'
import unhappyImage from '../../public/error.png'
import styles from './error.module.scss'

interface ErrorProps {
    message: string
}

const Error : React.FC<ErrorProps> = ({message}) => {
    return (
        <figure className={styles.errorFigure}>
            <div className={styles.errorImg}><Image src={unhappyImage} alt="An error occured."></Image></div>
            <figcaption>{message}</figcaption>
        </figure>
    )
}

export default Error