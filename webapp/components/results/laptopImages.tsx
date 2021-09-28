import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import styles from './laptopImages.module.scss'

interface LaptopImagesProps {
	imageUrls: string[],
}

const LaptopImages: React.FC<LaptopImagesProps> = ({imageUrls}) => {
	const imageAndThumbnailUrls = imageUrls.map((imageUrl) => {
		return {
			original: imageUrl,
			thumbnail: imageUrl
		}
	})
	return (
		<>
			<ImageGallery 
				items={imageAndThumbnailUrls} 
				showFullscreenButton={false} 
				showPlayButton={false} 
				showThumbnails={false} 
				showBullets={true}
				isRTL={true} 
				additionalClass={styles.behindNavbar}/>
		</>
	)
}
export default LaptopImages
