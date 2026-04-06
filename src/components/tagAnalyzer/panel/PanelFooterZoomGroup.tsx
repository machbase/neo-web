import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { MdCenterFocusStrong } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';

// Renders the footer zoom and focus controls for the panel navigator.
const PanelFooterZoomGroup = ({
    pOnZoomAction,
}: {
    pOnZoomAction: (aAction: 'zoomIn' | 'zoomOut' | 'focus', aZoom?: number) => void;
}) => {
    return (
        <Button.Group style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}>
            <Button
                size="icon"
                variant="ghost"
                isToolTip
                toolTipContent="Zoom in"
                icon={<img src={ZoomInFour} style={{ width: '20px', height: '20px' }} />}
                onClick={() => pOnZoomAction('zoomIn', 0.4)}
            />
            <Button
                size="icon"
                variant="ghost"
                isToolTip
                toolTipContent="Zoom in"
                icon={<img src={ZoomInTwo} style={{ width: '20px', height: '20px' }} />}
                onClick={() => pOnZoomAction('zoomIn', 0.2)}
            />
            <Button
                size="icon"
                variant="ghost"
                isToolTip
                toolTipContent="Focus"
                icon={<MdCenterFocusStrong style={{ width: '20px', height: '20px' }} />}
                onClick={() => pOnZoomAction('focus')}
            />
            <Button
                size="icon"
                variant="ghost"
                isToolTip
                toolTipContent="Zoom out"
                icon={<img src={ZoomOutTwo} style={{ width: '20px', height: '20px' }} />}
                onClick={() => pOnZoomAction('zoomOut', 0.2)}
            />
            <Button
                size="icon"
                variant="ghost"
                isToolTip
                toolTipContent="Zoom out"
                icon={<img src={ZoomOutFour} style={{ width: '20px', height: '20px' }} />}
                onClick={() => pOnZoomAction('zoomOut', 0.4)}
            />
        </Button.Group>
    );
};

export default PanelFooterZoomGroup;
