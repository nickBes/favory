import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'
import styles from '@/styles/article.module.scss'

const WhyUS : React.FC = () => {
    const router = useRouter()
    return (
        <article className={styles.article}>    
            <Navbar path={router.pathname}></Navbar>
            <section className={styles.articleSection}>
                <span className={styles.title}><h1>למה אנחנו ?</h1></span>
                <div>
                    <p>האתר שלנו מיוחד מכמה סיבות. ראשית כל, אנחנו הראשונים והיחידים המיישמים סוג זה של שירות בישראל. המתחרים שלנו בעסק פועלים בארצות אחרות ולא פונים לשוק הישראלי. מלבד זאת, המתחרים שלנו פועלים באופנים הדומים אחד לשני, וחולקים את אותה חולשה, היא חוסר ההתאמה למשתמש.</p>
                    <p>האתר שלנו משתמש בשאלון קצר ופשוט להתאמת העדפות המשתמש. השאלון לוקח כדקה ולא מצריך מהמשתמש שום ידע קודם במחשבים.</p>
                </div>
            </section>
        </article>
    )
}

export default WhyUS