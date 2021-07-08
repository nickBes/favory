import * as net from 'net'
import {AsyncAutoResetEvent} from '@esfx/async-autoresetevent'
import {Mutex} from 'async-mutex'

const SELECTOR_SERVER_PORT = 4741
const RECONNECTION_TIMEOUT = 1000

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

function setSocketEvents(){
    // only set the reconnection event when not in development mode, since it keeps 
    // the socket alive after recompile, whcih is very annoying
    socket.on('close', reconnect)
    socket.on('error', ()=>socket.destroy())
    socket.on('timeout', ()=>socket.destroy())
    socket.on('connect', ()=>{
        onConnectedEvent.set();
        connected = true
    })
    socket.on('data', (data)=>{
        socketData = data;
        onDataEvent.set();
    })
}

let socket = createConnectionToSelector();
setSocketEvents();

let connected = false;
let socketData:undefined|Buffer;
const onDataEvent = new AsyncAutoResetEvent(false)
const onConnectedEvent = new AsyncAutoResetEvent(false);
// a mutex over the socket and the connected variables
const mutex = new Mutex();

// sends the selection request to the selector and returns the selection results
export async function select(request: SelectionRequest): Promise<SelectedLaptopInfo[]> {
    let response: SelectionResponse | undefined;
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
