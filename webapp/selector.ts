import * as net from 'net'
import {AsyncAutoResetEvent} from '@esfx/async-autoresetevent'
import {Mutex} from 'async-mutex'
import {RWProtected} from './rwprotected'
import {MutexProtected} from './mutexprotected'

const SELECTOR_SERVER_PORT = 4741
const RECONNECTION_TIMEOUT = 1000
const RELOAD_CATEGORY_NAMES_AND_PRICE_LIMITS_TIMEOUT = 30000
const env = process.env.NODE_ENV

export type SelectionRequestParameters = {
	maxPrice: number,
	categoryScores: {
		[category_name: string]: number,
	}
}

export type SelectorRequest =
	| {
		type: "selection",
		parameters: SelectionRequestParameters
	}
	| {
		type: "fetchCategoryNamesAndPriceLimits",
	}

export type SelectedLaptop = {
	name: string,
	price: number,
	cpu: string,
	gpu: string,
	score: number,
}

type SelectorResponse<T> = {
	success: boolean,
	content: T | null,
}

type CategoryNamesAndPriceLimits = {
	categoryNames: string[],
	maxPrice: number,
	minPrice: number,
}

export type PriceLimits = {
	max: number,
	min: number
}

// a mutex over the socket and the connected variables.
// it's initiated before the exported functions
// as they are using this variable
const mutex = new Mutex();

let socket: net.Socket;
let isConnected = new MutexProtected<boolean>(false);
let socketData = new MutexProtected<undefined | Buffer>(undefined);
const onDataEvent = new AsyncAutoResetEvent(false)
const onConnectedEvent = new AsyncAutoResetEvent(false);

// the cached category names and price limits, fetched from the selector using
// the `fetchCategoryNamesAndPriceLimits` function.
let categoryNamesAndPriceLimits: RWProtected<CategoryNamesAndPriceLimits | undefined> =
	new RWProtected(undefined);

// an event that is fired when the category names and price limits are fetched and
// written to the `categoryNamesAndPriceLimits` global variable by the 
// `fetchCategoryNamesAndPriceLimits` function. This event is used to make sure that 
// if someone tries to access `categoryNamesAndPriceLimits` before it was initially fetched, 
// we could wait for the data to be fetched, instead of busy waiting for it which would consume
// huge amounts of cpu, or throwing an exception which will cause many problems. for more info
// see https://github.com/nickBes/favory/pull/42#discussion_r676050675
let onCategoryNamesAndPriceLimitsFetched = new AsyncAutoResetEvent(false);

// in production we setup the socket on strartup, since only one socket is used throughout
// the whole time the server is up. on devevelopment on the other hand, we create a new socket
// for each selection request. for more information about why this is neccessary, #25.
if (env == "production") {
	setupSocket();
}

// on startup, fetch the category names and price limits and cache them. we only need to fetch 
// this data once since it is cached in the global variable `categoryNamesAndPriceLimits`, 
// and it can be accessed from everywhere in the code using the `getCategoryNames`
// and `getPriceLimits` functions. if the cached info needs to be updated, the 
// `fetchCategoryNamesAndPriceLimits` can be used.
fetchCategoryNamesAndPriceLimits();

// we also want to periodically reload the category names and price limits from the selector
// to make sure that the information on the webapp is up to date
setTimeout(fetchCategoryNamesAndPriceLimits, RELOAD_CATEGORY_NAMES_AND_PRICE_LIMITS_TIMEOUT);

// note: requires locking the mutex
function createConnectionToSelector() {
	return net.createConnection(SELECTOR_SERVER_PORT, "127.0.0.1")
}

// reconnects the production mode socket to the selector server in case of a communication error
function reconnect(){
	setTimeout(async ()=>{
		await notifyEventsOnSocketError()
		await setupSocket()
	}, RECONNECTION_TIMEOUT)
}

// sets handlers for the the sockets events (connect, data, etc)
function setSocketEvents(){
    // only set the reconnection events when in production mode, since in dev mode it keeps 
    // the socket alive after recompile, which prevents the server from accepting the socket
    // of the new recompiled version, and it forces you to completely rerun the app, and it
    // is very annoying
    if (env == "production"){
        socket.on('close', reconnect)
        socket.on('error', ()=>socket.destroy())
        socket.on('timeout', ()=>socket.destroy())
    }else{
        socket.on('error', notifyEventsOnSocketError);
        socket.on('timeout', notifyEventsOnSocketError);
    }
    socket.on('connect', async ()=>{
        await isConnected.set(true);
        onConnectedEvent.set();
    })
    socket.on('data', async (data)=>{
        await socketData.set(data)
        onDataEvent.set();
    })
}

// notifies the onConnected and onData events to prevent a deadlock
// when a socket error occures. 
//
// the deadlock occurs because if a thread is currently inside the 
// `sendRequestaAndGetResponseContent` function, and is currently using
// the mutex while waiting for the `onData` event, the reconnection
// will cause a deadlock since it will also try to lock the mutex
async function notifyEventsOnSocketError(){
    if (await isConnected.get()){
        // an error has occured while trying to receive data,
        // set the onDataEvent to wake the waiting function up,
        // and set the data to undefined to let the waiting 
        // function know that an error has occured.
        await socketData.set(undefined)
        onDataEvent.set()
    }else{
        // an error has occured while trying to connect to the
        // selector. set the onConnectedEvent to wake the waiting 
        // function up, and set the isConnected flag to false to let
        // the waiting function know that an error has occured.
        await isConnected.set(false)
        onConnectedEvent.set()
    }
}


// creates a socket, adds event handlers, and connects to the selector server, without
// locking the mutex. this should only be called inside of mutex.runExclusive.
function setupSocketWithoutLocking() {
	socket = createConnectionToSelector();
	setSocketEvents();
}

// creates a socket, adds event handlers, and connects to the selector server
async function setupSocket() {
	// when modifying the socket, lock the mutex to prevent us from modifying it
	// while is is being used elsewhere
	await mutex.runExclusive(async () => {
		setupSocketWithoutLocking()
	})
}

// sends a request object to the selector server, receives his response, and deserializes it
// into the R type (where R stands for the response content type).
async function sendRequestaAndGetResponseContent<R>(request: SelectorRequest): Promise<R>{
    let response: SelectorResponse<R> | undefined;
    // in development we create a socket for each request, but we only setup the socket
    // inside of mutex.runExclusive, so we can't check if we're connected at this point.
    if(env == "production"){
        // if we're not yet connected, wait until we are
        // note that this is done outside the mutex to prevent a deadlock, since waiting
        // for the connected event while the mutex is locked, will block the reconnection process,
        // since reconnection requires locking the mutex for accessing the socket.
        if(!await isConnected.get()){
            await onConnectedEvent.wait();
        }
    }


    await mutex.runExclusive(async ()=>{
        // in development mode, create a new socket for each selection request, and then close
        // it when we're done. This is neccessary since when nextjs recompiles our project
        // it doesn't close the socket from the previous version of the webapp, and thus it blocks
        // the server from accepting the new socket of the new webapp. So instead we use a new socket
        // for each selection request, so we can make sure it is closed when we're done selecting.
        // for more info see #25.
        if (env == "development"){
            setupSocketWithoutLocking();
            await onConnectedEvent.wait();
        }

        // make sure we reset the on data event before sending,
        // so that we won't accidentally reset it after receiving the mesage
        onDataEvent.reset();

        // send the message
        socket.write(JSON.stringify(request))

        // wait for data
        await onDataEvent.wait();
        
        // decode the data
        let responseString = (await socketData.get())?.toString();
        if(responseString == undefined){
			// if the onDataEvent was set but no data was recevied then it means
			// that a socket error occured and we should retry once reconnected
			return await sendRequestaAndGetResponseContent(request)
        }

        // parse the data
        response = JSON.parse(responseString)
        
        // if we're in development mode, we close the socket when we're done,
        // since in development mode a new socket is created for each selection request.
        // for more information about this see #25.
        if (env == "development"){
            socket.destroy();
        }
    })

	// the response is undefined if a socket error has occured,
	// so we should retry to perform the request
    if(response === undefined){
		return await sendRequestaAndGetResponseContent(request)
    }
    if(!response.success || response.content === null){
        throw new Error('the selector returned a failure response')
    }
    return response.content;
}

// sends the selection request to the selector and returns the selection results
export async function select(requestParameters: SelectionRequestParameters): Promise<SelectedLaptop[]> {
	return await sendRequestaAndGetResponseContent({
		type: "selection",
		parameters: requestParameters
	});
}

// fetches the category names and price limits from the selector and caches them in the
// global variable `categoryNamesAndPriceLimits`. the cached data can be accessed
// using the `getCategoryNames` and `getPriceLimits` functions.
export async function fetchCategoryNamesAndPriceLimits() {
	await categoryNamesAndPriceLimits.set(await sendRequestaAndGetResponseContent({
		type: "fetchCategoryNamesAndPriceLimits"
	}))
	onCategoryNamesAndPriceLimitsFetched.set();
}

// this function tries to get the category names and price limits from the 
// `categoryNamesAndPriceLimits` variable. if it does not contain any data, it
// waits for the data to be fetched and then returns the data.
async function getCachedCategoryNamesAndPriceLimits(): Promise<CategoryNamesAndPriceLimits> {
	let cachedData: CategoryNamesAndPriceLimits | undefined = await categoryNamesAndPriceLimits.get();
	// while the cached data is currently undefined, wait for it to be fetched, and
	// then try to read it once again. 
	while (cachedData === undefined) {
		await onCategoryNamesAndPriceLimitsFetched.wait();
		cachedData = await categoryNamesAndPriceLimits.get();
	}
	return cachedData;
}

// returns the cached category names, which were fetched from the selector using
// the `fetchCategoryNamesAndPriceLimits` function.
export async function getCategoryNames(): Promise<string[]> {
	return (await getCachedCategoryNamesAndPriceLimits()).categoryNames
}

// returns the cached price limits, which were fetched from the selector using
// the `fetchCategoryNamesAndPriceLimits` function.
export async function getPriceLimits(): Promise<PriceLimits>{
    let cachedData = await getCachedCategoryNamesAndPriceLimits();
    return {
        max: cachedData.maxPrice,
        min: cachedData.minPrice
    }
}
