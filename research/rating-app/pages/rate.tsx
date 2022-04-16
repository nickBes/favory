import React, {useEffect, useState} from "react"
import Sortable, {Laptop} from "@/components/sortable"
import Button from "@/components/utils/button"
import axios from "axios"
import {GetServerSideProps} from "next"
import fetchLaptops from "fetchLaptops"
import {withPageAuthRequired} from "@auth0/nextjs-auth0"

interface RatingPageProps {
    initialLaptops: Laptop[]
}

const RatingPage: React.FC<RatingPageProps> = ({initialLaptops}) => {
    const [laptopList, setLaptopList] = useState(initialLaptops)

    const postRatingAndGetNext = async () => {
        // parse into array of ids
        const laptopIds = laptopList.map(laptop => laptop.id)
        // post the array of ids and manage cases
        let nextLaptops = await axios.post("/api/post-rating", laptopIds)
            .then(response => response.data as Laptop[])


        if (nextLaptops) {
            setLaptopList(nextLaptops)
        }
    }


    return (
        <main className="container mx-auto flex flex-col items-center gap-6 p-4">
            <Sortable laptopList={laptopList} setLaptops={setLaptopList} />
            <Button onClick={postRatingAndGetNext}>Submit</Button>
        </main>
    )
}

export const getServerSideProps = withPageAuthRequired({
    returnTo: '/api/auth/login',
    async getServerSideProps(_) {
        return {
            props: {
                initialLaptops: fetchLaptops()
            }
        }
    }
})

export default RatingPage
