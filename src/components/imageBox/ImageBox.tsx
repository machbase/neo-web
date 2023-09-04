import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';

export interface ImageBoxProps {
    pBase64Code: string;
    pType: string;
}

export const ImageBox = (props: ImageBoxProps) => {
    const { pBase64Code, pType } = props;

    const type = pType === 'svg' ? pType + '+xml' : pType;
    const convertSrc = `data:image/${type};base64,${pBase64Code}`;

    return (
        <Lightbox
            open={true}
            plugins={[Inline, Zoom, Fullscreen]}
            slides={[{ src: convertSrc }]}
            carousel={{ finite: true }}
            render={{ buttonPrev: () => null, buttonNext: () => null }}
            styles={{ container: { backgroundColor: '#272831' } }}
        />
    );
};
