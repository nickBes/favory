import {Mutex} from 'async-mutex'

// represents a mutex protected piece of data of type T.
export class MutexProtected<T>{
    protected readonly mutex: Mutex;
    protected data: T;
    constructor(data: T) {
        this.data = data;
        this.mutex = new Mutex();
    }

    // safely returns the data. this should only be used to read data, and you must
    // never modify the data returned from this method. if you want to call a method on
    // the data use the `modify` method.
    async get(): Promise<T> {
        // we can't say that data is T, since we will get a "used before assigned" error
        // so we give it an optional type and then coerce it into the type T.
        let data: T|undefined;
        await this.mutex.runExclusive(()=>{
            data = this.data;
        })
        return data as T;
    }

    // safely executes the modifier async function on the data allowing it to mutate it.
    async modify<R>(modifier: (data: T) => Promise<R>): Promise<R> {
        return await this.mutex.runExclusive(async ()=>{
            return await modifier(this.data)
        })
    }

    // sets the data to the given value.
    async set(newData: T): Promise<void> {
        await this.mutex.runExclusive(()=>{
            this.data = newData
        })
    }
}
