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
    title: 'מדוע לבחור בנו?'
  },
  '/contact': {
    title: 'צרו איתנו קשר'
  },
  '/about': {
    title: 'אודות | מי אנחנו?'
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
  }, [])

  return (
      <>
        <Head>
          <title>
            {title ?? 'פייבורי | favory'}
          </title>
          <meta name='description' content={description ?? ''}/>
        </Head>
        <Scrollable direction='vertical'>
          <Component {...pageProps}/>
          <Footer/>
        </Scrollable>
      </>
    )
}
export default App