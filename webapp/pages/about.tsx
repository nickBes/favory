import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'
import styles from '@/styles/article.module.scss'

const About : React.FC = () => {
    const router = useRouter()
    return (
        <>
            <article className={styles.article}>    
                <Navbar path={router.pathname}></Navbar>
                <section className={styles.articleSection}>
                    <span className={styles.title}><h1>אודות</h1></span>
                    <div>
                        <p><i>פייבורי</i> התחיל כצוות פיתוח קטן של שלושה תלמידי תיכון ישראליים. הרגשנו שרכישת מחשבים ניידים הייתה מסובכת מדי כיוון שהמון אנשים מתבלבלים בין כל האפשרויות השונות והמפרטים הטכניים המוזרים.</p>
                        <p>החלטנו ליצור פלטפורמה חדשה ופשוטה שלא רק תעזור להפוך את חווית הרכישה לקלה להבנה, אלא גם תתאים את המוצר לצרכים האישיים של המשתמש, יחד עם השוואת מחירים בין חנויות ובין דגמים, ללא שום צורך בידע קודם במחשבים.</p>
                    </div>
                </section>
            </article>
        </>
    )
}

export default About