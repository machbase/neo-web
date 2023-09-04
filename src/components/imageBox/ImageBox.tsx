import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';

export interface ImageBoxProps {
    pSrc: string;
}

export const ImageBox = (props: ImageBoxProps) => {
    const { pSrc } = props;

    return (
        <Lightbox
            open={true}
            plugins={[Inline, Zoom, Fullscreen]}
            slides={[{ src: pSrc }]}
            carousel={{ finite: true }}
            render={{ buttonPrev: () => null, buttonNext: () => null }}
            styles={{ container: { backgroundColor: '#272831' } }}
        />
    );
};
