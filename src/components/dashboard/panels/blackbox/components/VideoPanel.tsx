// Video Panel Component

import { useRef } from 'react';
import './VideoPanel.scss';

interface VideoPanelProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isLiveMode?: boolean;
    onFullscreen?: () => void;
}

const VideoPanel = ({ videoRef, isLiveMode: _isLiveMode = false, onFullscreen }: VideoPanelProps) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleFullscreen = async () => {
        if (onFullscreen) {
            onFullscreen();
            return;
        }

        const target = wrapperRef.current;
        if (!target) return;

        const isFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement;

        if (isFullscreen) {
            const exit = document.exitFullscreen || (document as any).webkitExitFullscreen;
            if (exit) await exit.call(document);
        } else {
            const request = target.requestFullscreen || (target as any).webkitRequestFullscreen;
            if (request) await request.call(target);
        }
    };

    return (
        <section className="blackbox-video-panel">
            <div className="video-wrapper" ref={wrapperRef}>
                <video
                    ref={videoRef}
                    playsInline
                    muted
                />
                <button
                    className="fullscreen-btn"
                    onClick={handleFullscreen}
                    aria-label="전체 화면 전환"
                >
                    ⤢
                </button>
            </div>
        </section>
    );
};

export default VideoPanel;
