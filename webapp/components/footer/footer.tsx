import React from "react"
import Image from 'next/image'
import styles from './footer.module.scss'
import fbIcon from '@/public/media/fb.png'
import igIcon from '@/public/media/ig.png'
import lkIcon from '@/public/media/lk.png'


const Footer : React.FC = () => {
    return (
        <footer className={styles.footer}>
            <ul>
                <li><a href='https://www.facebook.com/people/Favory/100065238591445/'><Image src={fbIcon} alt='Facebook'></Image></a></li>
                <li><a href='https://www.instagram.com/favory.il/'><Image src={igIcon} alt='Instagram'></Image></a></li>
                <li><a href='https://www.linkedin.com/company/favoryisrael/'><Image src={lkIcon} alt='LinkedIn'></Image></a></li>

            </ul>
            <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/"><Image width={80} height={15} alt="Creative Commons License" src="https://i.creativecommons.org/l/by-nc-nd/4.0/80x15.png" /></a>
            <div style={{direction: 'ltr'}}>This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-nd/4.0/">Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License</a></div>
        </footer>
    )
}

export default Footer