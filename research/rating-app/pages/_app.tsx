import React from "react"
import type { AppProps } from "next/app"
import { UserProvider } from "@auth0/nextjs-auth0"
import "@/styles/global.css"

const App : React.FC<AppProps> = ({Component, pageProps}) => {
    const { user } = pageProps
    return (
        <UserProvider user={user}>
            <Component {...pageProps}/>
        </UserProvider>
    )
}

export default App