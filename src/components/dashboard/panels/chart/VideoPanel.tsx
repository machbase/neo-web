import { useRef } from 'react';
// import './LineChart.scss';

// Public test video
const TEST_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

interface VideoPanelProps {
    pPanelInfo: any;
    pBoardTimeMinMax: { min: number; max: number };
    pIsHeader: boolean;
}

const VideoPanel = ({ pIsHeader }: VideoPanelProps) => {
    const videoRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={videoRef} className={`chart-form chart-message-success ${!pIsHeader ? 'chart-non-header' : ''}`}>
            <video
                src={TEST_VIDEO_URL}
                controls
                autoPlay
                muted
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        </div>
    );
};

export default VideoPanel;
