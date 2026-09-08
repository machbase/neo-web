/**
 * The floor a dashboard panel can be dragged down to, in react-grid-layout units.
 *
 * A panel with no `minW`/`minH` falls back to RGL's 1x1 default, which on this board
 * (`GRID_LAYOUT_COLS` 36, `GRID_LAYOUT_ROW_HEIGHT` 30) is roughly 37x30 px. That is smaller than
 * the panel's own chrome: the top 30 px is the drag strip (`.draggable-panel-header`) and the
 * bottom-right 20x20 px is the only resize handle RGL draws by default, so a panel shrunk that far
 * is almost impossible to grab and grow again — every miss drags the panel instead of resizing it.
 */
import { GRID_LAYOUT_MIN_H, GRID_LAYOUT_MIN_W } from './constants';

/** The `w`/`h` a layout item carries. Panels are `any` on the board, so both may be absent. */
export interface PanelSize {
    w?: unknown;
    h?: unknown;
}

export interface PanelMinSize {
    minW: number;
    minH: number;
}

/**
 * The floor for one axis, never above the size the panel is already saved at.
 *
 * Capping at the current size is what keeps this change from touching boards that are already
 * saved smaller than the floor. Two things would otherwise go wrong:
 *
 *   - RGL's `GridItem` propTypes reject `minW > w` ("minWidth larger than item width"), so every
 *     render of an existing small panel would log an error in dev.
 *   - The clamp itself lives only in `onResizeHandler`, not in render (measured in
 *     react-grid-layout@1.5.0), so such a panel would sit at its stored size and then jump the
 *     moment a handle was touched.
 *
 * The cap ratchets: once a panel is grown past the floor, `changeLayout` writes the larger size
 * back and the next render resolves the full floor, which it then cannot drop below again.
 */
const resolveAxisMin = (aFloor: number, aCurrent: unknown): number => {
    // A `w`/`h` hand-edited out of a .dsh can be anything. Anything that is not a usable size gets
    // the plain floor — returning NaN here would reach RGL's `clamp` and size the panel to NaN.
    if (typeof aCurrent !== 'number' || !Number.isFinite(aCurrent) || aCurrent < 1) return aFloor;
    return Math.min(aFloor, Math.floor(aCurrent));
};

/** `minW`/`minH` to hand a panel's `data-grid`, given the size it is saved at. */
export const resolvePanelMinSize = (aPanel: PanelSize | null | undefined): PanelMinSize => ({
    minW: resolveAxisMin(GRID_LAYOUT_MIN_W, aPanel?.w),
    minH: resolveAxisMin(GRID_LAYOUT_MIN_H, aPanel?.h),
});
