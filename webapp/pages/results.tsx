import React from 'react'
import Error from '../components/error/error'
import { GetServerSideProps } from 'next'
import getRawBody from 'raw-body'
import qs from 'querystring'

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

export const getServerSideProps : GetServerSideProps = async ctx => {
    let resultProps : ResultProps = {
        body: {}
    }
    if (ctx.req.method == 'POST') {
        resultProps.body = qs.parse(await getRawBody(ctx.req, {encoding: 'utf-8'}))
    }
    return {props: {resultProps: resultProps}}
}