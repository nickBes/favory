// __styles__
import styles from '@/styles/index.module.scss'

// __next & react__
import React, { useState, useRef, MutableRefObject } from 'react'
import { GetStaticProps } from 'next'
import { useRouter } from 'next/router'

// __selector__
import { PriceLimits, getCategoryNames, getPriceLimits } from '../selector'

// __components__
import Image from 'next/image'
import Navbar from '@/components/navbar/navbar'
import Form from '@/components/form/form'
import CardSelection, {CategoryMap} from '@/components/form/CardSelection'
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
import MultiSlider from '@/components/form/multi_slider'
// 3.price selection
import PriceSlider from '@/components/form/priceSlider'

interface HomeProps{
  categories: string[]
  priceLimits: PriceLimits
}

// this object is set manually as we choose the categories
// after research and it's not automatic yet.
// also dynamic image imorting is horrible in webpack
const categoryMap : CategoryMap = {
  'dev': {
    title: 'תכנות',
    description: 'בחרו באפשרות הזו אם אתם מתכוונים להתעסק בתכנות.',
    image: devIcon
  },
  'design': {
    title: 'עיצוב דיגיטלי',
    description: 'בחרו באפשרות הזו אם אתם מתכוונים להתעסק בתוכנות Adobe למיניהן או דומות להן.',
    image: designIcon
  },
  'gaming': {
    title: 'גיימינג או עיצוב תלת מימדי',
    description: 'בחרו באפשרות הזו אם אתם מתכוונים לשחק במשחקי מחשב או לעסוק בעיצוב תלת מימדי.',
    image: gamingIcon
  },
  'study': {
    title: 'למידה או עבודה מרחוק',
    description: 'בחרו באפשרות הזו אם אתם מתכוונים להשתמש בתוכנות Office למיניהן, לגלוש באינטרנט או לבצע כל פעולה או משימה בסיסית אחרת.',
    image: studyIcon
  }
}

const Home : React.FC<HomeProps> = ({ categories, priceLimits}) => {
  const [tags, setTags] = useState<string[]>([])
  const formRef = useRef<null | HTMLElement>(null)
  const ratingRef = useRef<null | HTMLElement>(null)
  const tagRef = useRef<null | HTMLElement>(null)
  const priceRef = useRef<null | HTMLElement>(null)
  const router = useRouter()

  const scrollToRef = (ref: MutableRefObject<null | HTMLElement>) => {
    return () => ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // using the card component
  const updateTags = (tag: string) => {
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
      <section>
        <Navbar path={router.pathname}></Navbar>
        <header className={styles.main}>
          <div className={styles.mainTextArea}>
            <h1>מצאו את המחשב הנייד האידיאלי שהכי מתאים לכם</h1>
            <p>ענו על שאלון קצר וקבלו את המחשב הנייד המתאים ביותר תוך שניות</p>
            <button onClick={scrollToRef(formRef)} className={styles.primaryButton}>התחלה</button>
          </div>
          <div className={styles.laptopImage}>
            <Image src={laptopImage} alt="Jermey"></Image>
          </div>
        </header>
      </section>
      <main ref={formRef}>
        <Form formAttr={{ action: "./results", method: 'post' }}>
          <Scrollable direction='horizontal'>
            <section ref={tagRef} className={styles.firstFormSection}>
                  <h1>בחרו בקטגוריות המתאימות לכם</h1>
                  <p>אנא בחרו לפחות קטגוריה אחת</p>
                  <CardSelection categoryMap={categoryMap} categories={categories} onCardClick={updateTags}></CardSelection>
                  {/* <Tags tags={tags} onTagClick={removeTag}></Tags>
                  <SearchBar suggestions={categories} onSuggestionClick={addTag} maxDisplayedSuggestions={5}></SearchBar> */}
                  <button type='button' onClick={tags.length == 1 ? scrollToRef(priceRef) : scrollToRef(ratingRef)} disabled={tags.length < 1}>הבא</button>
            </section>
            <section ref={ratingRef} hidden={tags.length < 2}>
              <div>
                <h1>דרגו את הקטגוריות שבחרתם.</h1>
                {/* {tags.map(tag => {
                  return (
                    <Slider key={tag} inputName={tag} max={100} min={0} defaultValue={50}></Slider>
                  )
                })} */}
                <MultiSlider tags={tags} min={0} max={100}></MultiSlider>
                <a onClick={scrollToRef(tagRef)}>Prev</a>
                <a onClick={scrollToRef(priceRef)}>Next</a>
              </div>
            </section>
            <section ref={priceRef}>
              <div>
                <h1>בחרו במחיר המקסימלי שתהיו מוכנים לשלם.</h1>
                <PriceSlider max={priceLimits.max} min={priceLimits.min} defaultValue={500} />
                <a onClick={tags.length <= 1 ? scrollToRef(tagRef) : scrollToRef(ratingRef)}>Prev</a>
                <input type="submit" />
              </div>
            </section>
          </Scrollable>
        </Form>
      </main>
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
