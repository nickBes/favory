import { NextApiHandler } from "next"
import { match, P } from "ts-pattern"

const postRating : NextApiHandler = (req, res) => {
    if (req.method === "POST") {
        return match(req.body)
                // matching the user data to an array of numbers
                .with(P.array(P.number), (laptopIDs) => {
                    // should return new laptop id's but don't
                    // have a functionality for that
                    // now we return a shuffeled array of IDs
                    return res.status(200).json(laptopIDs.sort(() => 0.5 - Math.random()))
                })
                .run()
    }
    return res.status(404).json("Not right endpoint.")
}

export default postRating