import { renderHook } from '@testing-library/react';
import { getPlayToggleButtonState, useStablePlaybackIconState } from './useStablePlaybackIconState';

describe('useStablePlaybackIconState', () => {
    it('keeps showing pause while a playing video is loading the next chunk', () => {
        const { result, rerender } = renderHook((props: { isPlaying: boolean; isLoading: boolean; isProbing: boolean }) => useStablePlaybackIconState(props), {
            initialProps: { isPlaying: true, isLoading: false, isProbing: false },
        });

        expect(result.current).toBe(true);

        rerender({ isPlaying: false, isLoading: true, isProbing: false });

        expect(result.current).toBe(true);
    });

    it('keeps showing pause while a playing video is probing for the next chunk', () => {
        const { result, rerender } = renderHook((props: { isPlaying: boolean; isLoading: boolean; isProbing: boolean }) => useStablePlaybackIconState(props), {
            initialProps: { isPlaying: true, isLoading: false, isProbing: false },
        });

        expect(result.current).toBe(true);

        rerender({ isPlaying: false, isLoading: false, isProbing: true });

        expect(result.current).toBe(true);
    });

    it('follows the actual playback state after loading and probing finish', () => {
        const { result, rerender } = renderHook((props: { isPlaying: boolean; isLoading: boolean; isProbing: boolean }) => useStablePlaybackIconState(props), {
            initialProps: { isPlaying: true, isLoading: false, isProbing: false },
        });

        rerender({ isPlaying: false, isLoading: true, isProbing: false });
        expect(result.current).toBe(true);

        rerender({ isPlaying: false, isLoading: false, isProbing: false });

        expect(result.current).toBe(false);
    });
});

describe('getPlayToggleButtonState', () => {
    it('keeps the play toggle visually enabled while a recorded video is probing', () => {
        expect(getPlayToggleButtonState({ isLive: false, isProbing: true })).toEqual({
            disabled: false,
            ariaDisabled: true,
        });
    });

    it('disables the play toggle in live mode', () => {
        expect(getPlayToggleButtonState({ isLive: true, isProbing: false })).toEqual({
            disabled: true,
            ariaDisabled: true,
        });
    });

    it('keeps the play toggle enabled when recorded playback is not probing', () => {
        expect(getPlayToggleButtonState({ isLive: false, isProbing: false })).toEqual({
            disabled: false,
            ariaDisabled: false,
        });
    });
});
