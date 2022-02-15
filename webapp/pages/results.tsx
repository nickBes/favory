import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Error from '@/components/error/error'
import { GetServerSideProps } from 'next'
import Navbar from '@/components/navbar/navbar'
import getRawBody from 'raw-body'
import qs from 'querystring'
import { SelectedLaptop, SelectionRequestParameters, select, getCategoryNames, getPriceLimits } from '@/server/selector'
import LaptopCard from '@/components/results/laptopCard'
import hasExceededRateLimit from '@/server/rateLimit'
import styles from '@/styles/results.module.scss'
import { match } from 'ts-pattern'

// type ClickedPopup = 'true' | 'false'

type LaptopMap = { [name: string] : SelectedLaptop }

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

interface ResultSuccessData {
	categories: string [],
	laptops: SelectedLaptop []
}

type ResultsPagePropsSuccess = {
	success: true,
	// if `data` is undefined, the results page will try to 
	// load the laptops from local storage
	data?: ResultSuccessData
}

type ResultsPagePropsFailure = {
	success: false,
	error: ResultsPageError
}

type ResultsPageProps =
	| ResultsPagePropsSuccess
	| ResultsPagePropsFailure


// returns a laptop array with placements instead of percentages
function laptopsWithPlacements (data : ResultSuccessData) {
	let map : LaptopMap = {}
	let laptopsCopy = [...data.laptops]
	data.categories.forEach(category => {
		// sort the scores for each category
		laptopsCopy.sort((first, second) => {
			return second.scoresInCategories[category] - first.scoresInCategories[category]
		})
		// assign the category score for each laptop to be the index
		// in the sorted array
		laptopsCopy.forEach((laptop, index) => {
			if (map[laptop.name]) {
				map[laptop.name].scoresInCategories[category] = index + 1
			} else {
				map[laptop.name] = {...laptop}
				map[laptop.name].scoresInCategories = {}
				map[laptop.name].scoresInCategories[category] = index + 1
			}
		})
	})

	console.log(map)

	return Object.values(map).sort((first, second) => second.score - first.score)
}
	
const Results: React.FC<ResultsPageProps> = (pageProps) => {
	const router = useRouter()
	// using useState here because we need access to the window.localStorage property, and we only 
	// have access to it inside callbacks to useState and useEffect
	const [resultData, _] = useState<ResultSuccessData | null>(() => {
		// make sure this code has acces to the window variable, since it needs to use the window.localStorage
		// property. for some reason this callback also sometimes gets called on the server side, in which
		// case it doesn't have access to window.localStorage.
		if (typeof window === 'undefined') {
			return null;
		}
		
		// make sure the result was successfull, otherwise we don't care about the laptops
		if (!pageProps.success) {
			return null;
		}

		if (!pageProps.data) {
			// if no data was given, try to load it from local storage
			const cachedLaptops = window.localStorage.getItem('resultData');
			if (cachedLaptops === null) {
				// no laptops found in local storage, redirect
				window.location.replace("/");
				return null;
			}
			return JSON.parse(cachedLaptops);
		} else {
			// if the laptops were loaded from the selector, cache them
			window.localStorage.setItem('resultData', JSON.stringify(pageProps.data))

			// parse laptop data && return
			return pageProps.data
		}
	});

	return match(pageProps)
		.with({success: true}, () => {
			if (!resultData) {
				// no laptops were be found, return an empty element just to let the redirect happen.
				return (<></>)
			}
			let laptops = laptopsWithPlacements(resultData)

			// not using the popup, see #228
			// const clickedPopup = Cookies.get('clickedPopup') as ClickedPopup | undefined
			// const showPopup = clickedPopup == 'false' || typeof clickedPopup === 'undefined'
			const bestLaptop = laptops.shift()
			return (
				<>
					<Navbar path={router.pathname}></Navbar>
					<section className={styles.laptopCardWrapper}>
						<div className={styles.infoTitle}>
							<h1>המחשב הנייד שבחרנו</h1>
							<p>גללו למטה למחשבים דומים</p>
						</div>
						{/* {showPopup ? <div  className={styles.ratingCard}>
											<figure>
												<h1>נשמח אם תענו על הסקר&nbsp;
													<a onClick={() => Cookies.set('clickedPopup', 'true', {path:'/results'})} 
														href='https://docs.google.com/forms/d/e/1FAIpQLSeOFRwkxqDLHSrSqW0qFpobOPEsl4qnsswWHocAtnljVW-Efg/viewform?usp=sf_link'>הזה
													</a>
												</h1>
											</figure>
										</div> : ''} */}
						{/* Will render only if bestLaptop exists */}
						{bestLaptop ? <LaptopCard open {...{categories: resultData.categories, ...bestLaptop}}></LaptopCard> : ''}
						{laptops.map((value, index) => <LaptopCard key={index} {...{categories: resultData?.categories, ...value}}></LaptopCard>)}
					</section>
				</>
			)
		})
		.with({success: false}, (pgProps) => {
			// somehow include information about the error
			return (
				<section>
					<Navbar path={router.pathname}></Navbar>
					<Error message={getErrorMessage(pgProps.error)}></Error>
				</section>
			)
		}).run()
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
	} else if (error.type == "selectionError") {
		return `internal server error`
	} else {
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
			let resultData : ResultSuccessData = {
				laptops: await select(selectionRequestExtractionResult.selectionRequest),
				categories: Object.keys(selectionRequestExtractionResult.selectionRequest.categoryScores)
			}
			return {
				success: true,
				// we'll display only the scores in the chosen categories
				data: resultData
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

export const getServerSideProps: GetServerSideProps = async ({req}) => {
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
		}
	} else if (req.method == 'GET') {
		result = {
			success: true,
			// undefined data tells the results page to try and load the laptops from localStorage.
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