import { useRef } from 'react';

interface StablePlaybackIconStateOptions {
    isPlaying: boolean;
    isLoading: boolean;
    isProbing: boolean;
}

export function useStablePlaybackIconState({ isPlaying, isLoading, isProbing }: StablePlaybackIconStateOptions): boolean {
    const stableIsPlayingRef = useRef(isPlaying);
    const isTransient = isLoading || isProbing;

    if (!isTransient) {
        stableIsPlayingRef.current = isPlaying;
    }

    return stableIsPlayingRef.current;
}
