import '@/styles/global.scss'
import React from 'react'
import Head from 'next/head'
import type { AppProps } from 'next/app'
import Scrollable from '../components/navigation/scrollable'
import Footer from '@/components/footer/footer'

const App : React.FC <AppProps> = ({ Component, pageProps }) => {
  return (
      <>
        <Head>
          <title>
            niceeeeeeee
          </title>
        </Head>
        <Scrollable direction='vertical'>
          <Component {...pageProps}/>
          <Footer/>
        </Scrollable>
      </>
    )
}
export default App