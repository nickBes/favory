import * as net from 'net'
import PromiseSocket from 'promise-socket'
import {Mutex} from 'async-mutex';

const SELECTOR_SERVER_PORT = 4741

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

const socket = new PromiseSocket(new net.Socket());
const mutex = new Mutex();

// this funciton is an IIF (immediately invoked function) since next js doesn't support running
// code on startup
(async function connectToSelector() {
    // we lock the mutex here to make sure no one can perform selection until we are connected
    // to the selector
    await mutex.runExclusive(async ()=>{
        socket.setEncoding('utf8')
        await socket.connect(SELECTOR_SERVER_PORT, "127.0.0.1");
    })
})()

export async function select(request: SelectionRequest): Promise<SelectedLaptopInfo[]> {
    let response: SelectionResponse|undefined;
    await mutex.runExclusive(async ()=>{
        await socket.write(JSON.stringify(request))
        const raw_response = await socket.readAll();
        if (typeof raw_response == 'string'){
            response = JSON.parse(raw_response)
        } else if(raw_response instanceof Buffer){
            response = JSON.parse(raw_response.toString())
        }else{
            throw new Error('failed to perform selection: the selector did not response')
        }
    })
    // this should never happed, since the callback in mutex.runExclusive should
    // either set the response and throw the exceptions, and in both cases this 
    // should never happen, but this check is added to resolve the type errors
    // of using response without checking if its undefined.
    if(response === undefined){
        throw new Error('failed to perform selection: an unknown error has occured')
    }
    if(!response.success || response.laptops === null){
        throw new Error('failed to perform selection: the selector returned a failure response')
    }
    return response.laptops
}
