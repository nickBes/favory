import React, {useState} from 'react'
import { GetStaticProps } from 'next'
import Navbar from '../components/navbar/navbar'
import Form from '../components/form/form'
import Tags from '../components/form/tags'

interface HomeProps {
  categories : string[]
}

const Home : React.FC <{homeProps : HomeProps}> = ({homeProps}) => {
  const strArr : string[] = homeProps.categories
  const [tags, setTags] = useState(strArr)

  return (
    <>  
      {/* sections have temporary class names in order to distinguish between them */}
      <section className='p'>
        <Navbar></Navbar>
        <div className='main'>
          <h1>Hey, what's going on guys it's me jermey.</h1>
          <p>Did you know that kndred was actually jin?</p>
          <img src="https://wallpaperaccess.com/full/1369012.jpg"></img>
        </div>
      </section>
      <section className='s'>
        <h1>Hey, what's going on guys it's me jermey.</h1>
        <Form formAttr={{action: "./results", method: 'post'}}>
          <Tags tagProps={{tags: tags, setTags: setTags, inputName: 'categories'}}></Tags>
          <input type="submit"/>
        </Form>
      </section>
      <section className='p'>
        <h1>Hey, what's going on guys it's me jermey.</h1>
      </section>
    </>
  )
}

export default Home

export const getStaticProps : GetStaticProps = async ctx => {
    let homeProps : HomeProps = {
      categories: []
    }
    // get categories from database
    homeProps.categories = ['gaming', 'dev', 'design', 'study']
    return {props: {homeProps: homeProps}}
}