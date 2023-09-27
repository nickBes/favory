// required icons
import devIcon from '@/public/categories/dev.png'
import devIconWhite from '@/public/categories/dev-white.png'
import designIcon from '@/public/categories/design.png'
import designIconWhite from '@/public/categories/design-white.png'
import gamingIcon from '@/public/categories/gaming.png'
import gamingIconWhite from '@/public/categories/gaming-white.png'
import studyIcon from '@/public/categories/study.png'
import studyIconWhite from '@/public/categories/study-white.png'
import { StaticImageData } from 'next/image'

export interface CategoryData {
    title : string,
    description: string,
    image: StaticImageData,
    white?: StaticImageData
    color?: string,
}

export type CategoryMap = {[category: string]: CategoryData}

// this object is set manually as we choose the categories
// after research and it's not automatic yet.
// also dynamic image imorting is horrible in webpack
export const defaultCategoryMap: CategoryMap = {
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

type matchCategoryCallback<T> = (category:string, categoryData: CategoryData, index: number) => T

// multiple times in webapp we need to match between the categories we recieve
// and their data, while processing them into an other array of data
export function matchCategoriesToCategoryMap<R>(categories : string[], categoryMap : CategoryMap, callback : matchCategoryCallback<R>) : R[]{
    let result : R[] = []
    categories.map((category, index) => {
        // checkes whether category exists in the
        // category map as the category map is created manually
        if (categoryMap[category]) {
            result.push(callback(category, categoryMap[category], index))
        }
    })
    return result
}