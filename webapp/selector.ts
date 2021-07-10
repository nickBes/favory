import * as net from 'net'
import {AsyncAutoResetEvent} from '@esfx/async-autoresetevent'
import {Mutex} from 'async-mutex'

const SELECTOR_SERVER_PORT = 4741
const RECONNECTION_TIMEOUT = 1000
const env = process.env.NODE_ENV

export type SelectionRequest = {
    amount: number,
    maxPrice?: number,
    categoryScores: {
        [category_name: string]: number,
    }
}

export type SelectedLaptopInfo = {
    name: string,
}

type SelectionResponse = {
    success: boolean,
    laptops: SelectedLaptopInfo[] | null,
}

// note: requires locking the mutex
function createConnectionToSelector(){
    return net.createConnection(SELECTOR_SERVER_PORT, "127.0.0.1")
}

// note: does not require locking the mutex
function reconnect(){
    console.log('reconnecting to selector...')
    mutex.runExclusive(async ()=>{
        // disconnected from server, set the connected flag accordingly
        connected = false;
    })
    setTimeout(() => {
        mutex.runExclusive(async ()=>{
            socket.destroy();
            socket = createConnectionToSelector();
            setSocketEvents();
        })
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
        onConnectedEvent.set();
        connected = true
    })
    socket.on('data', (data)=>{
        socketData = data;
        onDataEvent.set();
    })
}

let socket: net.Socket;
let connected = false;
let socketData:undefined|Buffer;
const onDataEvent = new AsyncAutoResetEvent(false)
const onConnectedEvent = new AsyncAutoResetEvent(false);
// a mutex over the socket and the connected variables
const mutex = new Mutex();

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

// sends the selection request to the selector and returns the selection results
export async function select(request: SelectionRequest): Promise<SelectedLaptopInfo[]> {
    let response: SelectionResponse | undefined;
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
    await mutex.runExclusive(async ()=>{
        // make sure we reset the on data event before sending,
        // so that we won't accidentally reset it after receiving the mesage
        onDataEvent.reset();

        // if we're not yet connected, wait until we are
        if(!connected){
            await onConnectedEvent.wait();
        }

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
    // either set the response and throw the exceptions, and in both cases this 
    // should never happen, but this check is added to resolve the type errors
    // of using response without checking if its undefined.
    if(response === undefined){
        throw new Error('an unknown error has occured')
    }
    if(!response.success || response.laptops === null){
        throw new Error('the selector returned a failure response')
    }
    return response.laptops
}
