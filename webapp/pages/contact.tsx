import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'
import styles from '@/styles/article.module.scss'

const Contact : React.FC = () => {
    const router = useRouter()
    return (
        <article className={styles.article}>    
            <Navbar path={router.pathname}></Navbar>
            <section className={styles.articleSection} style={{
                textAlign: 'center'
            }}>
                <span className={styles.title} style={{
                    cursor: 'pointer'
                }}><h1>favory.contact@gmail.com</h1></span>
                <p>רוצים לתת לנו ביקורת? להעלות רעיון? או סתם לשאול שאלה?</p>
            </section>
        </article>
    )
}

export default Contact