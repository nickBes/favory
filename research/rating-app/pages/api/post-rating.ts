import { NextApiHandler } from "next"
import { match, P } from "ts-pattern"

const postRating : NextApiHandler = (req, res) => {
    if (req.method === "POST") {
        return match(req.body)
                .with(P.array(P.number), (laptopIDs) => {
                    // should return new laptop id's but don't
                    // have a functionality for that
                    return res.status(200).json(laptopIDs)
                })
                .run()
    }
    return res.status(404).json("Not right endpoint.")
}

export default postRating