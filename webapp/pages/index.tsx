// __styles__
import styles from '@/styles/index/index.module.scss'

// __next & react__
import React, { useState, useRef, MutableRefObject } from 'react'
import { GetStaticProps } from 'next'

// __selector__
import { PriceLimits, getCategoryNames, getPriceLimits } from '../selector'

// __components__
import Image from 'next/image'
import Navbar from '@/components/navbar/navbar'
import Form from '@/components/form/form'
import Slider from '@/components/form/slider'
import Card, {CategoryData} from '@/components/form/card'
// import Tags from '@/components/form/tags'
// import SearchBar from '@/components/form/searchbar'
import Scrollable from '@/components/navigation/scrollable'

// __images__
// 1.landing page
import laptopImage from '@/public/laptop_mockup.png'
// 2.category selection
import devIcon from '@/public/categories/dev.png'
import designIcon from '@/public/categories/dev.png'
import gamingIcon from '@/public/categories/gaming.png'
import studyIcon from '@/public/categories/study.png'

interface HomeProps {
  categories: string[]
  priceLimits: PriceLimits
}

type CategoryMap = {[category: string]: CategoryData}

// this object is set manually as we choose the categories
// after research and it's not automatic yet.
// also dynamic image imorting is horrible in webpack
const categoryMap : CategoryMap = {
  'dev': {
    title: 'Development',
    description: 'Choose this option if you intend to engage in coding procedures.',
    image: devIcon
  },
  'design': {
    title: 'Digital art',
    description: 'Choose this option if you intend to use adobe software or any other similar ones.',
    image: designIcon
  },
  'gaming': {
    title: 'Gaming or 3D graphics',
    description: 'Choose this option if you intend to play video games or design 3D graphics.',
    image: gamingIcon
  },
  'study': {
    title: 'Studying or Working',
    description: 'Choose this option if you intend to use office software, browse the internet and engage in other basic tasks.',
    image: studyIcon
  }
}

const Home: React.FC<HomeProps> = ({ categories, priceLimits }) => {
  const [tags, setTags] = useState<string[]>([])
  const formRef = useRef<null | HTMLElement>(null)
  const ratingRef = useRef<null | HTMLElement>(null)
  const tagRef = useRef<null | HTMLElement>(null)
  const priceRef = useRef<null | HTMLElement>(null)

  const scrollToRef = (ref: MutableRefObject<null | HTMLElement>) => {
    return () => ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // using the card component
  const updateTags = (tag: string) => {
    // 
    setTags(prevTags => prevTags.includes(tag) ? prevTags.filter(val => val != tag) : [...prevTags, tag])
  }

  // using the tags and searchbar components
  // const removeTag = (tag: string) => {
  //   setTags(prevTags => prevTags.filter(value => value != tag))
  // }

  // const addTag = (suggestion: string) => {
  //   setTags(prevTags => prevTags.includes(suggestion) ? prevTags : [...prevTags, suggestion])
  // }

  return (
    <>
    {console.log(categories, priceLimits)}
      <section>
        <Navbar></Navbar>
        <div className={styles.main}>
          <div className={styles.mainTextArea}>
            <h1>Find the ideal laptop that matches you the best.</h1>
            <p>Answer a short questioneer and get the best matching laptop in a matter of seconds.</p>
            <button onClick={scrollToRef(formRef)}>START</button>
          </div>
          <div className={styles.laptopImage}>
            <Image src={laptopImage} alt="Jermey"></Image>
          </div>
        </div>
      </section>
      <section ref={formRef} className={styles.gray}>
        <Form formAttr={{ action: "./results", method: 'post' }}>
          <Scrollable direction='horizontal'>
            <section ref={tagRef}>
              <div>
                <h1>Choose your categories</h1>
                <div>
                  {categories.map((category, index) => {
                    if (categoryMap[category]) {
                      return (
                        <Card category={category}
                              title={categoryMap[category].title} 
                              image={categoryMap[category].image} 
                              description={categoryMap[category].description} 
                              onCardClick={updateTags}
                              key={index}>
                        </Card>
                      )
                    }
                  })}
                </div>
                {/* <Tags tags={tags} onTagClick={removeTag}></Tags>
                <SearchBar suggestions={categories} onSuggestionClick={addTag} maxDisplayedSuggestions={5}></SearchBar> */}
                <a onClick={scrollToRef(ratingRef)}>Next</a>
              </div>
            </section>
            <section ref={ratingRef}>
              <div>
                <h1>Rate the categories</h1>
                {tags.map(tag => {
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
                <Slider inputName='maxPrice' max={priceLimits.max} min={priceLimits.min} defaultValue={500}></Slider>
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
  // load the available categories and the price limits.
  // these were loaded from the selector and cached when the webapp has started.
  return {
    props: {
      categories: await getCategoryNames(),
      priceLimits: await getPriceLimits()
    }
  }
}