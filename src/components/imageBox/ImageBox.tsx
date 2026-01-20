import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';
import { Page } from '@/design-system/components';

export interface ImageBoxProps {
    pBase64Code: string;
    pType: string;
}

export const ImageBox = (props: ImageBoxProps) => {
    const { pBase64Code, pType } = props;

    const type = pType === 'svg' ? pType + '+xml' : pType;
    const convertSrc = `data:image/${type};base64,${pBase64Code}`;

    return (
        <Page>
            <Page.Header />
            <Page.Body>
                <Lightbox
                    open={true}
                    plugins={[Inline, Zoom, Fullscreen]}
                    slides={[{ src: convertSrc }]}
                    carousel={{ finite: true }}
                    render={{ buttonPrev: () => null, buttonNext: () => null }}
                    styles={{ container: { backgroundColor: 'inherit' } }}
                />
            </Page.Body>
        </Page>
    );
};
