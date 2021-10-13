import {MutexProtected} from "mutexprotected"

const WINDOW_DURATION_SECONDS = 120

const MAX_REQUESTS_PER_WINDOW = 12

const CLEANUP_EVERY_SECONDS = 30

// in a rate-limiting context, windows are a period of time from the moment a user has sent his first request,
// until some period of time, called the window duration, has passed. windows are used to limit the amount of
// request sent from an ip address for some period of time (the window duration). for example, we can set the
// window duration to 10 minutes, and the max amount of request per window to 100, to limit each ip address
// to 100 requests per 10 minutes. the `currentWindows` variable stores the time of the first request sent
type WindowInfo = {
	start: Date,
	amountOfRequests: number,
}
type WindowsMap = {[ip:string]: WindowInfo}

// by some ip address since the last window.
let currentWindows = new MutexProtected<WindowsMap>({});

// note that a mutex is not required here since this variable is only used inside of
// MutexProtected.modify, which means the mutex of currentWindows is already pretecting 
// it.
let lastCleanupTime = new Date();

function ellapsedSecondsSince(date:Date):number{
	// divide by 1000 to convert from milliseconds to seconds
	return (new Date().getTime() - date.getTime())/1000
}

function runCleanup(currentWindows: WindowsMap){
	for(const ip in currentWindows){
		let currentWindow = currentWindows[ip];

		// if the window is already over, delete it to free up memory
		const ellapsedSecondsSinceStartOfWindow = ellapsedSecondsSince(currentWindow.start)
		if(ellapsedSecondsSinceStartOfWindow >= WINDOW_DURATION_SECONDS){
			delete currentWindows[ip]
		}
	}
}

function runCleanupIfNeeded(currentWindows: WindowsMap){
	const ellapsedSecondsSinceLastCleanup = ellapsedSecondsSince(lastCleanupTime)
	if(ellapsedSecondsSinceLastCleanup >= CLEANUP_EVERY_SECONDS){
		runCleanup(currentWindows)
		lastCleanupTime = new Date()
	}
}

async function hasExceededRateLimit(ip:string):Promise<boolean>{
	return await currentWindows.modify(async (currentWindows)=>{

		runCleanupIfNeeded(currentWindows)

		if(ip in currentWindows){
			const currentWindow = currentWindows[ip];

			// find the ellapsed seconds since the first request of this window
			const ellapsedSecondsSinceStartOfWindow = ellapsedSecondsSince(currentWindow.start)
			
			// if `WINDOW_DURATION` seconds have passed since the start of the current window, then it is over
			// and we can start a new window
			if (ellapsedSecondsSinceStartOfWindow > WINDOW_DURATION_SECONDS){
				currentWindows[ip] = {
					start: new Date(),
					amountOfRequests: 1
				}
				return false
			}else{
				// window is not over yet, check if we have any request left
				if(currentWindow.amountOfRequests < MAX_REQUESTS_PER_WINDOW){
					currentWindow.amountOfRequests+=1;
					return false
				}else{
					// this ip has reached its limit
					return true
				}
			}
		}else{
			// ip hasn't sent any request yet, create a window for it
			currentWindows[ip] = {
				start: new Date(),
				amountOfRequests: 1
			}
			return false
		}
	})
}

export default hasExceededRateLimit
