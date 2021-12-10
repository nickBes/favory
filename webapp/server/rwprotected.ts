import { RWLock } from 'async-rwlock'

// represents a read write protected piece of data of type T.
export class RWProtected<T>{
    protected readonly lock: RWLock;
    protected data: T;
    constructor(data: T) {
        this.data = data;
        this.lock = new RWLock();
    }

    // safely returns the data. this should only be used to read data, and you must
    // never modify the data returned from this method. if you want to call a method on
    // the data use the `modify` method.
    async get(): Promise<T> {
        await this.lock.readLock();
        let data = this.data;
        this.lock.unlock();
        return data;
    }

    // safely executes the modifier async function on the data allowing it to mutate it.
    async modify(modifier: (data: T) => Promise<void>): Promise<void> {
        await this.lock.writeLock();
        // using a try-finally clause to make sure an exception is now thrown while
        // the lock is still locked, causing it to stay locked forever.
        try {
            await modifier(this.data)
        } finally {
            this.lock.unlock();
        }
    }

    // sets the data to the given value.
    async set(newData: T): Promise<void> {
        await this.lock.writeLock();
        this.data = newData;
        this.lock.unlock();
    }
}