import React from 'react'
import {useRouter} from 'next/router'
import Error from '../components/error/error'
import {GetServerSideProps} from 'next'
import Navbar from '@/components/navbar/navbar'
import getRawBody from 'raw-body'
import qs from 'querystring'
import {SelectedLaptop, SelectionRequestParameters, select, getCategoryNames, getPriceLimits} from '../selector'
import cookie from 'cookie'
import LaptopResultsList from '@/components/results/laptopResultsList'
import hasExceededRateLimit from 'rateLimit'
import styles from '@/styles/results.module.scss'

type ResultsPageInvalidFieldError = {
	type: "invalidField",
	fieldName: string,
}

type ResultsPageMissingFieldError = {
	type: "missingField",
	fieldName: string,
}

type ResultsPageSelectionError = {
	type: "selectionError",
	errorMessage: string,
}

type ResultsPageInvalidMethodError = {
	type: "invalidMethod"
}

type ResultsPageTooManyRequestsError = {
	type: "tooManyRequests"
}
type ResultsPageError =
	| ResultsPageInvalidFieldError
	| ResultsPageMissingFieldError
	| ResultsPageSelectionError
	| ResultsPageInvalidMethodError
	| ResultsPageTooManyRequestsError

type ResultsPagePropsSuccess = {
	success: true,
	laptops: SelectedLaptop[]
}

type ResultsPagePropsFailure = {
	success: false,
	error: ResultsPageError
}

type ResultsPageProps =
	| ResultsPagePropsSuccess
	| ResultsPagePropsFailure

const Results: React.FC<ResultsPageProps> = (pageProps) => {
	const router = useRouter()

	console.log('selection result:', pageProps)
	if (pageProps.success) {
		return (
			<section className={styles.mainContent}>
				<Navbar path={router.pathname}></Navbar>
				<h1>תוצאות השאלון</h1>
				<LaptopResultsList laptops={pageProps.laptops} />
			</section>
		)
	} else {
		// somehow include information about the error
		return (
			<section>
				<Navbar path={router.pathname}></Navbar>
				<Error message={getErrorMessage(pageProps.error)}></Error>
			</section>
		)
	}
}

export default Results

type SelectionRequestExtractionResultSuccess = {
	success: true,
	selectionRequest: SelectionRequestParameters,
}

type SelectionRequestExtractionResultFailure = {
	success: false,
	error: ResultsPageError,
}

type SelectionRequestExtractionResult =
	| SelectionRequestExtractionResultSuccess
	| SelectionRequestExtractionResultFailure

// returns a human readable error message for the given error
function getErrorMessage(error: ResultsPageError): string {
	if (error.type == "invalidField") {
		return `invalid value for field "${error.fieldName}"`
	} else if (error.type == "missingField") {
		return `missing field "${error.fieldName}"`
	} else if (error.type == "tooManyRequests") {
		return `you have reached your requests limit`
	} else if (error.type == "invalidMethod") {
		return `invalid HTTP method`
	} else if (error.type == "selectionError"){
		return `internal server error`
	} else{
		return "";
	}
}


// extracts the selection request from the query
async function extractSelectionRequestFromQuery(query: qs.ParsedUrlQuery): Promise<SelectionRequestExtractionResult> {
	// first parse all the fields into numbers
	let parsedFields: {[fieldName: string]: number} = {}
	for (const fieldName in query) {
		let value = query[fieldName]
		// we expect each field to be a string
		if (typeof value != 'string') {
			return {
				success: false,
				error: {
					type: "invalidField",
					fieldName
				}
			}
		}
		let parsedValue = Number.parseFloat(value);
		// if the parsedValue is NaN, it means that we failed to parse it
		if (isNaN(parsedValue)) {
			return {
				success: false,
				error: {
					type: "invalidField",
					fieldName
				}
			}
		}

		parsedFields[fieldName] = parsedValue;
	}

	// extract the max price from the query
	if (!('maxPrice' in parsedFields)) {
		return {
			success: false,
			error: {
				type: "missingField",
				fieldName: "maxPrice"
			}
		}
	}
	let maxPrice: number = parsedFields.maxPrice;

	// make sure that `maxPrice` is within the selector's price limits
	let priceLimits = await getPriceLimits();
	if (maxPrice > priceLimits.max || maxPrice < priceLimits.min) {
		return {
			success: false,
			error: {
				type: "invalidField",
				fieldName: "maxPrice"
			}
		}
	}

	// we must delete the `maxPrice` property since after extracing it's value
	// we want iterate over all of the other properties other than the `maxPrice` property,
	// which represent the user's category scores
	delete parsedFields.maxPrice;

	// load the available categories (these were loaded from the selector and cached when the webapp has started)
	// and convert them to a set so that we can check if it contains each user provided category name.
	let available_categories = new Set(await getCategoryNames());
	// the rest of the field should represent the category scores,
	// make sure all field names correspond to category names
	for (const fieldName in parsedFields) {
		if (!available_categories.has(fieldName)) {
			return {
				success: false,
				error: {
					type: 'invalidField',
					fieldName
				}
			}
		}
	}

	return {
		success: true,
		selectionRequest: {
			maxPrice, categoryScores: parsedFields,
		}
	}
}

// extracts the selection request from the query, performs the selection,
// and returns the result
async function performRequestedSelection(query: qs.ParsedUrlQuery): Promise<ResultsPageProps> {
	let selectionRequestExtractionResult = await extractSelectionRequestFromQuery(query)
	if (selectionRequestExtractionResult.success) {
		try {
			let laptops = await select(selectionRequestExtractionResult.selectionRequest)
			return {
				success: true,
				laptops
			}
		} catch (e) {
			return {
				success: false,
				error: {
					type: 'selectionError',
					errorMessage: (e as Error).message,
				}
			}
		}
	} else {
		return {
			success: false,
			error: selectionRequestExtractionResult.error
		}
	}
}

export const getServerSideProps: GetServerSideProps = async ({req, res}) => {
	let result: ResultsPageProps;
	if (req.method == 'POST') {
		if (await hasExceededRateLimit(req.socket.remoteAddress as string)) {
			console.log('exceeded rate limit')
			result = {
				success: false,
				error: {
					type: "tooManyRequests",
				}
			}
		} else {
			let query = qs.parse(await getRawBody(req, {encoding: 'utf-8'}))

			result = await performRequestedSelection(query);

			// when the user sends a new selection request, we should cache the results of the 
			// request, so that if he returns to the page using a GET request, we can present him
			// with his previous results.
			const cookie_data = cookie.serialize('previousResults', JSON.stringify(result), {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24,
				sameSite: 'strict',
				path: '/results'
			})
			res.setHeader('set-cookie', cookie_data)
		}
	} else if (req.method == 'GET') {
		const previousResults: string | undefined = cookie.parse(req.headers.cookie || '').previousResults
		if (previousResults) {
			result = JSON.parse(previousResults)
		} else {
			return {
				redirect: {
					destination: '/',
					permanent: false,
				}
			}
		}
	} else {
		result = {
			success: false,
			error: {
				type: 'invalidMethod'
			}
		}
	}
	return {
		props: result
	}
}
