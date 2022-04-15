import Link from "next/link"
import React from "react"
import { useUser } from "@auth0/nextjs-auth0"

const IndexPage : React.FC = () => {
    const { user } = useUser()

    return (
        <>
            {user ? <Link href="/api/auth/logout">Log Out</Link> : <Link href="/api/auth/login">Log In</Link>}
            <br/>
            <Link href="/rate">Rating Page</Link>
        </>
    )
}

export default IndexPage