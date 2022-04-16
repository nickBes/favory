import fetchLaptops from "fetchLaptops"
import { NextApiHandler } from "next"
import { match, P } from "ts-pattern"

const postRating : NextApiHandler = (req, res) => {
    if (req.method === "POST") {
        return match(req.body)
                // matching the user data to an array of numbers
                .with(P.array(P.number), (_laptopIDs) => {
                    return res.status(200).json(fetchLaptops())
                })
                .run()
    }
    return res.status(404).json("Not right endpoint.")
}

export default postRating
