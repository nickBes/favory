import '../styles/global.scss'
import React from 'react'
import Head from 'next/head'
import Scrollable from '../components/navigation/scrollable'
import type { AppProps } from 'next/app'

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
        </Scrollable>
      </>
    )
}
export default App