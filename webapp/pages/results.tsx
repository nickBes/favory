import React from 'react'
import Error from '../components/error/error'
import { GetServerSideProps } from 'next'
import getRawBody from 'raw-body'
import qs from 'querystring'
import { SelectedLaptopInfo, SelectionRequest, select } from '../selector'


type SelectionResultSuccess = {
    status: "success",
    laptops: SelectedLaptopInfo[]
}

type SelectionResultInvalidField = {
    status: "invalidField",
    fieldName: string
}

type SelectionResultFailure = {
    status: "failure",
    error: string,
}

type SelectionResult =
    | SelectionResultSuccess
    | SelectionResultInvalidField
    | SelectionResultFailure

// hardcoding the categories is a temporary solution to allow for checking,
// the categories should be fetched in _app.tsx using getStaticServerProps
const AVAILABLE_CATEGORIES = new Set([
    "dev", "study", "design", "gaming"
])

const Results: React.FC<{ selectionResult: SelectionResult }> = ({ selectionResult }) => {
    console.log('selection result:',selectionResult)
    if(selectionResult.status == "success"){
        return (
            <div>{JSON.stringify(selectionResult.laptops)}</div>
        )
    }else if(selectionResult.status == "invalidField"){
        // somehow include information about the invalid field (selectionResult.fieldName)
        return (
            <Error></Error>
        )
    }else {
        // somehow include information about the error (selectionResult.error)
        return (
            <Error></Error>
        )
    }
}

export default Results

type SelectionRequestExtractionResultSuccess = {
    success: true,
    selectionRequest: SelectionRequest,
}

type SelectionRequestExtractionResultInvalidField = {
    success: false,
    fieldName: string,
}

type SelectionRequestExtractionResult =
    | SelectionRequestExtractionResultInvalidField
    | SelectionRequestExtractionResultSuccess

// extracts the selection request from the query
function extractSelectionRequestFromQuery(query: qs.ParsedUrlQuery): SelectionRequestExtractionResult {
    // first parse all the fields into numbers
    let parsedFields: { [fieldName: string]: number } = {}
    for (const fieldName in query) {
        let value = query[fieldName]
        // we expect each field to be a string
        if (typeof value != 'string') {
            return {
                success: false,
                fieldName
            }
        }
        let parsedValue = Number.parseFloat(value);
        // if the parsedValue is NaN, it means that we failed to parse it
        if (isNaN(parsedValue)) {
            return {
                success: false,
                fieldName
            }
        }

        parsedFields[fieldName] = parsedValue;
    }

    // extract the amount
    let amount = parsedFields.amount;
    // we must delete the property since after extracting the pre-known
    // properties (the properties that we know the name of in advance),
    // we iterate over the rest of the properties, which should
    // represents the category scores.
    delete parsedFields.amount;

    // extract the max price, note that it is an optional field
    let maxPrice: number | undefined;
    if ('maxPrice' in parsedFields) {
        maxPrice = parsedFields.maxPrice
        // we must delete the property since after extracting the pre-known
        // properties, we iterate over the rest of the properties, which should
        // represents the category scores
        delete query.maxPrice;
    }

    // the rest of the field should represent the category scores,
    // make sure all field names correspond to category names
    for (const fieldName in parsedFields) {
        if (!AVAILABLE_CATEGORIES.has(fieldName)) {
            return {
                success: false,
                fieldName
            }
        }
    }

    return {
        success: true,
        selectionRequest: {
            amount, maxPrice, categoryScores: parsedFields,
        }
    }
}

// extracts the selection request from the query, performs the selection,
// and returns the result
async function performRequestedSelection(query: qs.ParsedUrlQuery): Promise<SelectionResult> {
    let selectionRequestExtractionResult = extractSelectionRequestFromQuery(query)
    if (selectionRequestExtractionResult.success) {
        try {
            let laptops = await select(selectionRequestExtractionResult.selectionRequest)
            return {
                status: "success",
                laptops
            }
        } catch (e) {
            return {
                status: "failure",
                error: (e as Error).message
            }
        }
    } else {
        return {
            status: "invalidField",
            fieldName: selectionRequestExtractionResult.fieldName,
        }
    }
}

export const getServerSideProps: GetServerSideProps = async ctx => {
    let result: SelectionResult;
    if (ctx.req.method == 'POST') {
        let query = qs.parse(await getRawBody(ctx.req, { encoding: 'utf-8' }))
        result = await performRequestedSelection(query);
    } else {
        result = {
            status: "failure",
            error: 'only POST is allowed'
        }
    }
    return {
        props: {
            selectionResult: result
        }
    }
}