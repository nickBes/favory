import * as net from 'net'
import {AsyncAutoResetEvent} from '@esfx/async-autoresetevent'
import {Mutex} from 'async-mutex'

const SELECTOR_SERVER_PORT = 4741
const RECONNECTION_TIMEOUT = 1000
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

export type SelectedLaptopInfo = {
    name: string,
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

// note: requires locking the mutex
function createConnectionToSelector(){
    return net.createConnection(SELECTOR_SERVER_PORT, "127.0.0.1")
}

// safely fetches the value of the `_connected` flag using the mutex
async function isConnected(){
    let result = false;
    await mutex.runExclusive(async ()=>{
        result = _connected
    })
    return result;
}

// safely sets the value of the `_connected` flag using the mutex
async function setIsConnected(isConnected: boolean){
    await mutex.runExclusive(async ()=>{
        _connected = isConnected;
    })
}

// note: does not require locking the mutex
async function reconnect(){
    console.log('reconnecting to selector...')
    // disconnected from server, set the isConnected flag accordingly
    setIsConnected(false);
    setTimeout(() => {
        setupSocket();
    }, RECONNECTION_TIMEOUT);
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
    }
    socket.on('connect', ()=>{
        setIsConnected(true);
        onConnectedEvent.set();
    })
    socket.on('data', (data)=>{
        socketData = data;
        onDataEvent.set();
    })
}

// sets up the permanent socket, which is used in production 
async function setupSocket(){
    // when modifying the socket, lock the mutex to prevent us from modifying it
    // while is is being used elsewhere
    await mutex.runExclusive(async () =>{
        socket = createConnectionToSelector();
        setSocketEvents();
    })
}

// in production we setup the socket on strartup, since only one socket is used throughout
// the whole time the server is up. on devevelopment on the other hand, we create a new socket
// for each selection request. for more information about why this is neccessary, #25.
if (env == "production"){
    setupSocket();
}

// sends a request object to the selector server, receives his response, and deserializes it
// into the R type (where R stands for the response content type).
async function sendRequestaAndGetResponseContent<R>(request: SelectorRequest): Promise<R>{
    let response: SelectorResponse<R> | undefined;
    // in development mode, create a new socket for each selection request, and then close
    // it when we're done. This is neccessary since when nextjs recompiles our project
    // it doesn't close the socket from the previous version of the webapp, and thus it blocks
    // the server from accepting the new socket of the new webapp. So instead we use a new socket
    // for each selection request, so we can make sure it is closed when we're done selecting.
    // for more info see #25.
    // note that we dont setup the socket inisde of the mutex's runExclusive method since
    // setupSocket internally locks the mutex.
    if (env == "development"){
        await setupSocket();
    }

    // if we're not yet connected, wait until we are
    // note that this is done outside the mutex to prevent a deadlock, since waiting
    // for the connected event while the mutex is locked, will block the reconnection process,
    // since reconnection requires locking the mutex for accessing the socket.
    if(!await isConnected()){
        await onConnectedEvent.wait();
    }


    await mutex.runExclusive(async ()=>{
        // make sure we reset the on data event before sending,
        // so that we won't accidentally reset it after receiving the mesage
        onDataEvent.reset();

        // send the message
        await socket.write(JSON.stringify(request))

        // wait for data
        await onDataEvent.wait();

        // decode the data
        let responseString = socketData?.toString();
        if(responseString == undefined){
            throw new Error('failed to decode response buffer')
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

    // this should never happed, since the callback in mutex.runExclusive should
    // either set the response or throw an exception, and in both cases this 
    // should never happen, but this check is added to resolve the type errors
    // of using response without checking if its undefined.
    if(response === undefined){
        throw new Error('an unknown error has occured')
    }
    if(!response.success || response.content === null){
        throw new Error('the selector returned a failure response')
    }
    return response.content;
}

// sends the selection request to the selector and returns the selection results
export async function select(requestParameters: SelectionRequestParameters): Promise<SelectedLaptopInfo[]> {
    return await sendRequestaAndGetResponseContent({
        type: "selection",
        parameters: requestParameters
    });
}

// fetches the category names and price limits from the selector and caches them in the
// global variable `categoryNamesAndPriceLimits`. the cached data can be accessed
// using the `getCategoryNames` and `getPriceLimits` functions.
export async function fetchCategoryNamesAndPriceLimits(){
    await categoryNamesAndPriceLimitsMutex.runExclusive(async ()=>{
        categoryNamesAndPriceLimits =  await sendRequestaAndGetResponseContent({
            type: "fetchCategoryNamesAndPriceLimits"
        })
    })
    onCategoryNamesAndPriceLimitsFetched.set();
}

// this function tries to get the category names and price limits from the 
// `categoryNamesAndPriceLimits` variable. if it does not contain any data, it
// waits for the data to be fetched and then returns the data.
async function getCachedCategoryNamesAndPriceLimits(): Promise<CategoryNamesAndPriceLimits>{
    let cachedData: CategoryNamesAndPriceLimits|undefined;
    // read the cached data safely
    await categoryNamesAndPriceLimitsMutex.runExclusive(async ()=>{
        cachedData = categoryNamesAndPriceLimits
    })
    // while the cached data is currently undefined, wait for it to be fetched, and
    // then try to read it once again. 
    while (cachedData === undefined){
        await onCategoryNamesAndPriceLimitsFetched.wait();
        await categoryNamesAndPriceLimitsMutex.runExclusive(async ()=>{
            cachedData = categoryNamesAndPriceLimits
        })
    }
    return cachedData;
}

// returns the cached category names, which were fetched from the selector using
// the `fetchCategoryNamesAndPriceLimits` function.
export async function getCategoryNames(): Promise<string[]>{
    return await (await getCachedCategoryNamesAndPriceLimits()).categoryNames
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

let socket: net.Socket;
let _connected = false;
let socketData:undefined|Buffer;
const onDataEvent = new AsyncAutoResetEvent(false)
const onConnectedEvent = new AsyncAutoResetEvent(false);
// a mutex over the socket and the connected variables
const mutex = new Mutex();

// the cached category names and price limits, fetched from the selector using
// the `fetchCategoryNamesAndPriceLimits` function.
let categoryNamesAndPriceLimits: CategoryNamesAndPriceLimits|undefined;
// a mutex over the `categoryNamesAndPriceLimits` global variable.
let categoryNamesAndPriceLimitsMutex = new Mutex();
// an event that is fired when the category names and price limits are fetched and
// written to the `categoryNamesAndPriceLimits` global variable. it is called by 
// the `fetchCategoryNamesAndPriceLimits` function.
let onCategoryNamesAndPriceLimitsFetched = new AsyncAutoResetEvent(false);
// on startup, fetch the category names and price limits and cache them. we only need to fetch 
// this data once since it is cached in the global variable `categoryNamesAndPriceLimits`, 
// and it can be accessed from everywhere in the code using the `getCategoryNames`
// and `getPriceLimits` functions. if the cached info needs to be updated, the 
// `fetchCategoryNamesAndPriceLimits` can be used.
fetchCategoryNamesAndPriceLimits();
