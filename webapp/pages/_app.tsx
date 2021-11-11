import '@/styles/global.scss'
import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import type { AppProps } from 'next/app'
import Scrollable from '../components/navigation/scrollable'
import Footer from '@/components/footer/footer'
import { useRouter } from 'next/router'

interface pathData {
  title: string
  description?: string
}

type PathDataMap = {[key : string] : pathData}

const pathDataMap : PathDataMap = {
  '/': {
    title: 'פייבורי עמוד ראשי | מציאת מחשב נייד',
    description: 'פייבורי (Favory) זה אתר יעוץ מחשבים ניידים. באתר יוצג שאלון קצר שיעזור לכם למצוא את המחשב הנייד שמתאים לכם.'
  },
  '/results': {
    title: 'תוצאות השאלון'
  },
  '/why-us': {
    title: 'מדוע לבחור בנו?',
    description: 'מבין המתחרים אנו הראשונים שיוצרים שאלון התאמת מחשבים ניידים בישראל. כמו כן אנחנו היחידים שכוללים את דירוג השימושים שלכם.'
  },
  '/contact': {
    title: 'צרו איתנו קשר',
    description: 'שלחו לנו במייל את השאלות, הצעות או את הפניות העסקיות שלכם.'
  },
  '/about': {
    title: 'אודות | מי אנחנו?',
    description: 'תדעו עלינו, איך המיזם התחיל ומה המטרה שלנו.'
  }
}

const App : React.FC <AppProps> = ({ Component, pageProps }) => {
  const router = useRouter()
  const { title, description } = router.pathname in pathDataMap ? pathDataMap[router.pathname] : null || {}

  // disable browser scroll restoration
  // and setting up language
  useEffect(() => {
    window.history.scrollRestoration = 'manual'
    document.documentElement.lang = 'he'
    window.scrollTo(0, 0)
  }, [])

  const getBodyData = () => {
    return (
      <>
        <Component {...pageProps}/>
        <Footer/>
      </>
    )
  }

  return (
      <>
        <Head>
          <link rel="shortcut icon" href="/favicon.ico"/>
          <title>
            {title ?? 'פייבורי | favory'}
          </title>
          <meta name='description' content={description ?? ''}/>
        </Head>
        {/* temporary solution for weird scroll to bottom in results */}
        {router.pathname != "/results" ? <Scrollable direction='vertical'>{getBodyData()}</Scrollable> : getBodyData()}
      </>
    )
}
export default App