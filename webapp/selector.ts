import * as net from 'net'
import PromiseSocket from 'promise-socket'

const SELECTOR_SERVER_PORT = 4741

type SelectionRequest = {
    amount: number,
    max_price?: number,
    category_scores: {
        [category_name: string]: number,
    }
}

type SelectedLaptopInfo = {
    name: string,
}

type SelectionResponse = {
    success: boolean,
    laptops: [SelectedLaptopInfo] | null,
}

const socket = new PromiseSocket(new net.Socket());

async function connectToSelector() {
    socket.setEncoding('utf8')
    await socket.connect(SELECTOR_SERVER_PORT, "127.0.0.1");
}

async function select(request: SelectionRequest): Promise<[SelectedLaptopInfo]> {
    await socket.write(JSON.stringify(request))
    const raw_response = await socket.readAll();
    let response: SelectionResponse;
    if (typeof raw_response == 'string'){
        response = JSON.parse(raw_response)
    } else if(raw_response instanceof Buffer){
        response = JSON.parse(raw_response.toString())
    }else{
        throw new Error('failed to perform selection: the selector did not response')
    }
    if(!response.success || response.laptops === null){
        throw new Error('failed to perform selection: the selector returned a failure response')
    }
    return response.laptops
}
