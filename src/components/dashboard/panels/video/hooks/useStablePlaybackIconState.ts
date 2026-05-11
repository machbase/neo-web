import { useRef } from 'react';

interface StablePlaybackIconStateOptions {
    isPlaying: boolean;
    isLoading: boolean;
    isProbing: boolean;
}

interface PlayToggleButtonStateOptions {
    isLive: boolean;
    isProbing: boolean;
}

interface PlayToggleButtonState {
    disabled: boolean;
    ariaDisabled: boolean;
}

export function getPlayToggleButtonState({ isLive, isProbing }: PlayToggleButtonStateOptions): PlayToggleButtonState {
    return {
        disabled: isLive,
        ariaDisabled: isLive || isProbing,
    };
}

export function useStablePlaybackIconState({ isPlaying, isLoading, isProbing }: StablePlaybackIconStateOptions): boolean {
    const stableIsPlayingRef = useRef(isPlaying);
    const isTransient = isLoading || isProbing;

    if (!isTransient) {
        stableIsPlayingRef.current = isPlaying;
    }

    return stableIsPlayingRef.current;
}
