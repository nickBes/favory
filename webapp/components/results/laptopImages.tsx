import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";

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
			<ImageGallery items={imageAndThumbnailUrls} showFullscreenButton={false} showPlayButton={false} isRTL={true} />
		</>
	)
}
export default LaptopImages
