import React, { useState, useRef } from 'react'
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
          <button onClick={() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}>Scroll to form.</button>
          <img src="https://wallpaperaccess.com/full/1369012.jpg"></img>
        </div>
      </section>
      <section ref={formRef} className='gray'>
        <Form formAttr={{ action: "./results", method: 'post' }}>
          <Scrollable direction='horizontal'>
            <section ref={tagRef}>
              <div>
                <Tags tagProps={{ tags: tags, onClick: removeTag }}></Tags>
                <SearchBar searchBarProps={{ suggestions: new Set(homeProps.categories), onClick: addTag, maxListSize: 5 }}></SearchBar>
                <a onClick={() => {
                  ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
                }}>Next</a>
              </div>
            </section>
            <section ref={ratingRef}>
              <div>
                {Array.from(tags).map(tag => {
                  return (
                    <Slider key={tag} sliderProps={{ inputName: tag, max: 100, min: 0, defaultValue: 50 }}></Slider>
                  )
                })}
                <br />
                <a onClick={() => {
                  tagRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
                }}>Prev</a>
                <br />
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