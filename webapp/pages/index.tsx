import React, { useState, useRef, MutableRefObject } from 'react'
import { GetStaticProps } from 'next'
import Navbar from '../components/navbar/navbar'
import Form from '../components/form/form'
import Slider from '../components/form/slider'
import Tags from '../components/form/tags'
import SearchBar from '../components/form/searchbar'
import Scrollable from '../components/navigation/scrollable'

interface HomeProps {
  categories: Array<string>
}

const Home: React.FC<{ homeProps: HomeProps }> = ({ homeProps }) => {
  const [tags, setTags] = useState(new Set<string>())
  const formRef = useRef<null | HTMLElement>(null)
  const ratingRef = useRef<null | HTMLElement>(null)
  const tagRef = useRef<null | HTMLElement>(null)
  const priceRef = useRef<null | HTMLElement>(null)

  const scrollToRef = (ref : MutableRefObject<null | HTMLElement> ) => {
    return () => ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const removeTag = (tag: string) => {
    setTags(new Set(Array.from(tags).filter(value => value != tag)))
  }

  const addTag = (suggestion: string) => {
    setTags(new Set([...tags, suggestion]))
  }

  return (
    <>
      <section>
        <Navbar></Navbar>
        <div className='main'>
          <h1>Hey, what's going on guys it's me jermey.</h1>
          <p>Did you know that kndred was actually jin?</p>
          <button onClick={scrollToRef(formRef)}>Scroll to form.</button>
          <img src="https://wallpaperaccess.com/full/1369012.jpg"></img>
        </div>
      </section>
      <section ref={formRef} className='gray'>
        <Form formAttr={{ action: "./results", method: 'post' }}>
          <Scrollable direction='horizontal'>
            <section ref={tagRef}>
              <div>
                <h1>Choose your categories</h1>
                <Tags tagProps={{ tags: tags, onClick: removeTag }}></Tags>
                <SearchBar searchBarProps={{ suggestions: new Set(homeProps.categories), onClick: addTag, maxListSize: 5 }}></SearchBar>
                <a onClick={scrollToRef(ratingRef)}>Next</a>
              </div>
            </section>
            <section ref={ratingRef}>
              <div>
                <h1>Rate the categories</h1>
                {Array.from(tags).map(tag => {
                  return (
                    <Slider key={tag} inputName={tag} max={100} min={0} defaultValue={50}></Slider>
                  )
                })}
                <a onClick={scrollToRef(tagRef)}>Prev</a>
                <a onClick={scrollToRef(priceRef)}>Next</a>
              </div>
            </section>
            <section ref={priceRef}>
              <div>
                <h1>Choose maximum price</h1>
                <Slider inputName='price' max={2000} min={200} defaultValue={500}></Slider>
                <a onClick={scrollToRef(ratingRef)}>Prev</a>
                <input type="submit" />
              </div>
            </section>
          </Scrollable>
        </Form>
      </section>
    </>
  )
}

export default Home

export const getStaticProps: GetStaticProps = async ctx => {
  let homeProps: HomeProps = {
    categories: new Array<string>()
  }
  // get categories from database
  homeProps.categories = ['gaming', 'dev', 'design', 'study']
  return { props: { homeProps: homeProps } }
}