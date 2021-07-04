import React from 'react'
import styles from '../../styles/error/error.module.scss'

const Error : React.FC = () => {
    return (
        <section>
            <img src='https://i.kym-cdn.com/photos/images/newsfeed/002/069/850/076.jpg' className={styles.errorImg}/>
        </section>
    )
}

export default Error