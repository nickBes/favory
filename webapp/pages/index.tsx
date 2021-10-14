// __styles__
import styles from '@/styles/index.module.scss'

// __next & react__
import React, {useState, useRef, MutableRefObject, useEffect} from 'react'
import {GetStaticProps} from 'next'
import {useRouter} from 'next/router'

// __selector__
import {PriceLimits, getCategoryNames, getPriceLimits} from '../selector'

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
import laptopImage from '@/public/laptop.png'
// 2.category selection
import devIcon from '@/public/categories/dev.png'
import devIconWhite from '@/public/categories/dev-white.png'
import designIcon from '@/public/categories/design.png'
import designIconWhite from '@/public/categories/design-white.png'
import gamingIcon from '@/public/categories/gaming.png'
import gamingIconWhite from '@/public/categories/gaming-white.png'
import studyIcon from '@/public/categories/study.png'
import studyIconWhite from '@/public/categories/study-white.png'
//import MultiSlider from '@/components/form/multi_slider'
import MultiSlider from '@/components/form/multi-slider/multi-slider'
// 3.price selection
import PriceSlider from '@/components/form/priceSlider'

interface HomeProps {
	categories: string[]
	priceLimits: PriceLimits
}

// this object is set manually as we choose the categories
// after research and it's not automatic yet.
// also dynamic image imorting is horrible in webpack
const categoryMap: CategoryMap = {
	'dev': {
		title: 'תכנות',
		description: 'בחרו באפשרות הזו אם אתם מתכוונים להתעסק בתכנות.',
		image: devIcon,
    white: devIconWhite,
    color: '#2ea486'
	},
	'design': {
		title: 'עיצוב דיגיטלי',
		description: 'בחרו באפשרות הזו אם אתם מתכוונים להתעסק בתוכנות Adobe למיניהן או דומות להן.',
		image: designIcon,
    white: designIconWhite,
    color: '#a42e2e'
	},
	'gaming': {
		title: 'גיימינג',
		description: 'בחרו באפשרות הזו אם אתם מתכוונים לשחק במשחקי מחשב או לעסוק בעיצוב תלת מימדי.',
		image: gamingIcon,
    white: gamingIconWhite,
    color: '#402ea4'
	},
	'study': {
		title: 'למידה ועבודה',
		description: 'בחרו באפשרות הזו אם אתם מתכוונים להשתמש בתוכנות Office למיניהן, לגלוש באינטרנט או לבצע כל פעולה או משימה בסיסית אחרת.',
		image: studyIcon,
    white: studyIconWhite,
    color: '#2e4da4'
	}
}

const Home: React.FC<HomeProps> = ({categories, priceLimits}) => {
	const [tags, setTags] = useState<string[]>([])
  	const [screenRatio, setScreenRatio] = useState(1)
	const formRef = useRef<null | HTMLElement>(null)
	const ratingRef = useRef<null | HTMLElement>(null)
	const tagRef = useRef<null | HTMLElement>(null)
	const priceRef = useRef<null | HTMLElement>(null)
	const router = useRouter()

	const scrollToRef = (ref: MutableRefObject<null | HTMLElement>) => {
		return () => ref.current?.scrollIntoView({behavior: 'smooth'})
		
	}

  useEffect(() => {
    setScreenRatio(window.screen.height / window.screen.width)
  }, [])

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
						<p>ענו על שאלון קצר וקבלו את המחשב הנייד המתאים ביותר תוך שניות אחדות</p>
						<button onClick={scrollToRef(formRef)} className={styles.primaryButton}>התחלה</button>
					</div>
					<div className={styles.laptopImage}>
						<Image width={1625} height={1125} src={laptopImage} layout='responsive' alt="תמונת מחשב נייד של העמוד הראשי" priority></Image>
					</div>
				</header>
			</section>
			<main ref={formRef}>
				<Form formAttr={{action: "./results", method: 'post'}}>
					<Scrollable direction='horizontal'>
						<section ref={tagRef} className={styles.firstFormSection}>
							<h1>בחרו בקטגוריות המתאימות לכם</h1>
							<p>אנא בחרו לפחות קטגוריה אחת</p>
							<CardSelection categoryMap={categoryMap} categories={categories} onCardClick={updateTags} toolTipBoundaryElement={tagRef}></CardSelection>
							{/* <Tags tags={tags} onTagClick={removeTag}></Tags>
                  <SearchBar suggestions={categories} onSuggestionClick={addTag} maxDisplayedSuggestions={5}></SearchBar> */}
              <button type='button' onClick={tags.length == 1 ? scrollToRef(priceRef) : scrollToRef(ratingRef)} disabled={tags.length < 1}>הבא</button>
            </section>
            <section ref={ratingRef}  style={{display: tags.length < 2 ? 'none' : 'flex'}} className={styles.secondFormSection}>
              <div className={styles.secondFormContent}>
                  <div className={styles.secondFormText}>
                    <h1>דרגו את הקטגוריות שבחרתם</h1>
                    <p>יש לגרור את הידיות כדי לערוך את המשקל של הקטגוריות</p>
                  </div>
                {/* {tags.map(tag => {
                  return (
                    <Slider key={tag} inputName={tag} max={100} min={0} defaultValue={50}></Slider>
                  )
                })} */}
                <div className={styles.multiSlider}>
                  <MultiSlider
                  min={0}
                  max={100}
                  bonesAmount={tags.length}
                  inputNames={tags}
                  minDistanceInPixelsBetweenJoints={35}
                  colors={tags.map(category => categoryMap[category].color ?? undefined)}
                  direction={screenRatio > 4/3 ? 'vertical' : 'horizontal'}
                  // jointTooltipsRenderer={
                  //   (_,distanceFromStart)=>{
                  //     return (
                  //     <div>
                  //       {distanceFromStart.toString()}
                  //     </div>
                  //           )
                  //   }
                  // }
                  boneTooltipsRenderer={
                    (index, boneWidth) => {
                      const data = categoryMap[tags[index]]
                      return (
                        <div>
                          <figure className={styles.sliderTooltip}>
							{/* make sure data.white is not undefined */}
                            <div className={styles.sliderTooltipImage}><Image width={100} height={100} src={data.white as StaticImageData} alt={data.title}></Image></div>
                            <figcaption>{Math.round(boneWidth * 100)}%</figcaption>
                          </figure>
                        </div>
                      )
                    }
                  } />
                </div>
                <div className={styles.secondSectionButtons}>
                  <button type='button' onClick={scrollToRef(tagRef)} className={styles.secondaryButton}>קודם</button>
                  <button type='button' onClick={scrollToRef(priceRef)}>הבא</button>
                </div>
              </div>
            </section>
            <section ref={priceRef} className={styles.thirdFormSection}>
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
				}}>
					<div className={styles.thirdSectionText}>
						<h1>בחרו במחיר המקסימלי שתהיו מוכנים לשלם</h1>
						<p>יש לגרור את הידית כדי לבחור את המחיר המקסימלי הרצוי</p>
					</div>
					<div className={styles.priceSliderWrapper}>
						<MultiSlider 
							colors={['#2e4da4']} 
							max={priceLimits.max} 
							min={priceLimits.min} 
							bonesAmount={2} 
							inputNames={['maxPrice']} 
							direction='horizontal'
							jointTooltipsRenderer={(index, distance, value) => (<>{value.toFixed()} ש"ח</>)} 
							minDistanceInPixelsBetweenJoints={0}/>
					</div>
					<div className={styles.thirdSectionButtons}>
						<button type='button' onClick={tags.length <= 1 ? scrollToRef(tagRef) : scrollToRef(ratingRef)} className={styles.secondaryButton}>קודם</button>
						<button type='submit' onClick={scrollToRef(priceRef)} className={styles.primaryButton}>סיום</button>
					</div>				
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
