import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import styles from './laptopImages.module.scss'

interface LaptopImagesProps {
	imageUrls: string[],
}

const LaptopImages: React.FC<LaptopImagesProps> = ({imageUrls}) => {
	const imageObjects = imageUrls.map((imageUrl) => {
		return {
			original: imageUrl,
			originalHeight: window.innerHeight/4,
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
export default LaptopImages
