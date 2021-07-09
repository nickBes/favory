import React, {useState} from 'react'
import { GetStaticProps } from 'next'
import Navbar from '../components/navbar/navbar'
import Form from '../components/form/form'
import Tags from '../components/form/tags'
import SearchBar from '../components/form/searchbar'

interface HomeProps {
  categories : string[]
}

const Home : React.FC <{homeProps : HomeProps}> = ({homeProps}) => {
  const [tags, setTags] = useState(new Set<string>())
  const [suggestions, setSuggestions] = useState(new Set(homeProps.categories))

  const addSuggestionByTagRemove = (suggestion : string) => {
    setTags(new Set(Array.from(tags).filter(value => value != suggestion)))
    setSuggestions(new Set([...suggestions, suggestion]))
  }

  const removeSuggestion = (suggestion : string) => {
    setSuggestions(new Set(Array.from(suggestions).filter(value => value != suggestion)))
    setTags(new Set([...tags, suggestion]))
  }

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
          <Tags tagProps={{tags: tags, onClick:addSuggestionByTagRemove}}></Tags>
          <SearchBar searchBarProps={{suggestions:suggestions, onClick:removeSuggestion}}></SearchBar>
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