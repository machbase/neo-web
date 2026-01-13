// Control Buttons Component

import './ControlButtons.scss';

interface ControlButtonsProps {
    isPlaying: boolean;
    isLoading: boolean;
    onPlayToggle: () => void;
    onReset: () => void;
    onPrevFrame: () => void;
    onNextFrame: () => void;
    onSeek: (seconds: number) => void;
}

const ControlButtons = ({
    isPlaying,
    isLoading,
    onPlayToggle,
    onReset,
    onPrevFrame,
    onNextFrame,
    onSeek,
}: ControlButtonsProps) => {
    return (
        <div className="blackbox-control-buttons">
            <button className="warning" onClick={onReset} disabled={isLoading}>
                Reset
            </button>
            <button onClick={onPlayToggle} disabled={isLoading}>
                {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button className="danger" onClick={onPrevFrame} disabled={isLoading}>
                Before Frame
            </button>
            <button className="danger" onClick={onNextFrame} disabled={isLoading}>
                Next Frame
            </button>
            <button className="teal" onClick={() => onSeek(-1)} disabled={isLoading}>
                -1s
            </button>
            <button className="teal" onClick={() => onSeek(1)} disabled={isLoading}>
                +1s
            </button>
            <button className="indigo" onClick={() => onSeek(-5)} disabled={isLoading}>
                -5s
            </button>
            <button className="indigo" onClick={() => onSeek(5)} disabled={isLoading}>
                +5s
            </button>
            <button className="orange" onClick={() => onSeek(-30)} disabled={isLoading}>
                -30s
            </button>
            <button className="orange" onClick={() => onSeek(30)} disabled={isLoading}>
                +30s
            </button>
            <button className="green" onClick={() => onSeek(-60)} disabled={isLoading}>
                -1m
            </button>
            <button className="green" onClick={() => onSeek(60)} disabled={isLoading}>
                +1m
            </button>
            <button className="slate" onClick={() => onSeek(-3600)} disabled={isLoading}>
                -1h
            </button>
            <button className="slate" onClick={() => onSeek(3600)} disabled={isLoading}>
                +1h
            </button>
        </div>
    );
};

export default ControlButtons;
