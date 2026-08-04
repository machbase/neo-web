// Width of the README drawer, remembered across opens and across sessions.
//
// A resizable panel that snaps back to its default every time you close it is
// worse than a fixed one: the user pays the drag repeatedly and never keeps the
// result. The value is one integer, so it lives in localStorage rather than in
// any store — nothing else needs to read it, and it must outlive the tab.
//
// SETTING AND PERSISTING ARE SEPARATE, and that split is a bug fix rather than
// tidiness. `localStorage.setItem` is synchronous and hits disk; writing on every
// pointermove meant a fast drag issued hundreds of blocking writes, which is what
// made the handle stutter and lag behind the cursor. The drag now writes once,
// when it ends.

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'appReadmePanelWidth';

export const README_PANEL_DEFAULT_WIDTH = 320;
/** Narrower than this and the markdown wraps every few words. */
export const README_PANEL_MIN_WIDTH = 240;
export const README_PANEL_MAX_WIDTH = 720;
/**
 * The app must never be squeezed to nothing: whatever the drag asks for, this
 * much of the package's own UI stays visible. The tab exists for the app, not
 * for its documentation.
 */
export const README_PANEL_MIN_APP_WIDTH = 200;

/** Clamps a requested width to the fixed bounds AND to what the container allows. */
export const clampReadmeWidth = (requested: number, containerWidth?: number): number => {
    // A NaN request (a pointer event with no usable coordinate) must not become the
    // width — `Math.min`/`Math.max` propagate NaN and it would reach the style.
    if (!Number.isFinite(requested)) return README_PANEL_DEFAULT_WIDTH;
    const roomCap = containerWidth && containerWidth > 0 ? containerWidth - README_PANEL_MIN_APP_WIDTH : README_PANEL_MAX_WIDTH;
    // `Math.max` last, so a container too narrow for the minimum still yields the
    // minimum rather than something negative.
    return Math.max(README_PANEL_MIN_WIDTH, Math.min(README_PANEL_MAX_WIDTH, roomCap, requested));
};

const readStored = (): number => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw === null ? NaN : Number(raw);
        // A corrupt or hand-edited value must not wedge the panel at 3px.
        return Number.isFinite(parsed) ? clampReadmeWidth(parsed) : README_PANEL_DEFAULT_WIDTH;
    } catch {
        // Private mode / storage disabled — the panel still works, it just forgets.
        return README_PANEL_DEFAULT_WIDTH;
    }
};

export interface ReadmePanelWidth {
    width: number;
    /** Live update during a drag. Cheap: state only, no storage. */
    setWidth: (next: number) => void;
    /** Called once when a drag ends. */
    persist: (next: number) => void;
}

export const useReadmePanelWidth = (): ReadmePanelWidth => {
    const [sWidth, setWidth] = useState<number>(readStored);

    const persist = useCallback((next: number) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, String(Math.round(next)));
        } catch {
            // Losing the preference is not worth failing a drag over.
        }
    }, []);

    return { width: sWidth, setWidth, persist };
};
