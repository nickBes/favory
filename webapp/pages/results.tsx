import React from 'react'
import Error from '../components/error/error'
import { GetServerSideProps } from 'next'
import getRawBody from 'raw-body'
import qs from 'querystring'
import cookie from 'cookie'

interface ResultProps {
    body : Object
}

const Results : React.FC<{resultProps : ResultProps}> = ({resultProps}) => { 
    if (JSON.stringify(resultProps.body) == JSON.stringify({})) {
        return (
            <Error/>
        )
    }
    return (
        <div>{JSON.stringify(resultProps.body)}</div>
    )
}

export default Results

export const getServerSideProps : GetServerSideProps = async ({req, res}) => {
    let resultProps : ResultProps = {
        body: {}
    }
    if (req.method == 'POST') {
        resultProps.body = qs.parse(await getRawBody(req, {encoding: 'utf-8'}))
        const cookie_data = cookie.serialize('req', JSON.stringify(resultProps.body), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24,
            sameSite: 'strict',
            path: '/results'
        })
        res.setHeader('set-cookie', cookie_data)
    } else if (req.method == 'GET') {
        const ck : string | undefined = cookie.parse(req.headers.cookie || '').req
        if (ck) {
            resultProps.body = JSON.parse(ck)
        }
    }
    return {props: {resultProps: resultProps}}
}