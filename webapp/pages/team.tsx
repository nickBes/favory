import React from 'react'
import Navbar from '@/components/navbar/navbar'
import { useRouter } from 'next/router'

const Team : React.FC = () => {
    const router = useRouter()
    return (
        <article> 
            <Navbar path={router.pathname}></Navbar>
            <h1>הצוות</h1>
            <p>פייבורי התחיל כצוות פיתוח קטן של שלושה תלמידי תיכון ישראליים.</p>
            <p>הרגשנו שרכישת מחשבים נייחים וניידים הייתה מסובכת הרבה יותר ממה שהיא אמורה להיות, כיוון שהמון אנשים לא יודעים להחליט בין כל האפשרויות השונות, ומתבלבלים מהמפרטים הטכניים המוזרים וים הנתונים חסרי המשמעות האינסופי.</p>
            <p>החלטנו ליצור פלטפורמה חדשה ופשוטה שלא רק תעזור להפוך את חווית הרכישה לקלה להבנה, אלא גם תתאים את המוצר לצרכים האישיים של המשתמש, ללא שום צורך בידע קודם במחשבים.</p>
        </article>
    )
}

export default Team