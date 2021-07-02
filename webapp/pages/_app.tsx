import '../styles/global.scss'
import Head from 'next/head'
import Navbar from '../components/navbar'
import Scrollable from '../components/scrollable'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return (
      <>
        <Head>
          <title>
            niceeeeeeee
          </title>
        </Head>
        <Scrollable>
          <Component {...pageProps}/>
        </Scrollable>
      </>
    )
}
export default MyApp
