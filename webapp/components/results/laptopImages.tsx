import ImageGallery from 'react-image-gallery'
import "react-image-gallery/styles/css/image-gallery.css"
import styles from './laptopImages.module.scss'
import notFoundImage from '@/public/image-not-found.png'
import Image from 'next/image'

interface LaptopImagesProps {
	imageUrls?: string[],
}

const LaptopImages: React.FC<LaptopImagesProps> = ({imageUrls}) => {
	// sometimes there are no images
	// so we need to also return an figure for
	// not having an image
	if (imageUrls && imageUrls.length > 0) {
		const imageObjects = imageUrls.map((imageUrl) => {
			return {
				original: imageUrl,
				originalHeight: window.innerHeight/5,
			}
		})
		return (
			<>
				<ImageGallery
					items={imageObjects}
					showFullscreenButton={false}
					showPlayButton={false}
					showThumbnails={false}
					isRTL={true}
					additionalClass={styles.behindNavbar} />
			</>
		)
	}
	return (
		<figure className={styles.notFound}>
			<Image width={24} height={24} src={notFoundImage}></Image>
			<figcaption>לא נמצאה תמונה</figcaption>
		</figure>
	)
}
export default LaptopImages