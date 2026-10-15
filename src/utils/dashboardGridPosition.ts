/**
 * What a dashboard hands react-grid-layout, made safe to hand over.
 *
 * The grid validates every coordinate and throws on one that is not a number — from the grid
 * itself, outside every panel's error boundary — so a single panel saved with `"x": "a"` or
 * `"w": {}` took the whole board down (#1547). These helpers only shape what the grid reads; the
 * panels keep their saved values until one is moved, which writes numbers back.
 */

// The values a new panel gets (panelValidator BASE_REQUIRED).
const DEFAULT_POSITION = { x: 0, y: 0, w: 7, h: 7 };

const toCoordinate = (aValue: unknown, aDefault: number): number => {
    if (typeof aValue === 'number' && Number.isFinite(aValue)) return aValue;
    if (typeof aValue === 'string' && aValue.trim() !== '' && Number.isFinite(Number(aValue))) return Number(aValue);
    return aDefault;
};

/** The panels the grid can place: entries that are objects. Anything else in the list is left as saved. */
export const getGridPanels = (aPanels: unknown): any[] => (Array.isArray(aPanels) ? aPanels.filter((aPanel) => aPanel !== null && typeof aPanel === 'object' && !Array.isArray(aPanel)) : []);

/** A panel's position as numbers, falling back to a new panel's for any that is not one. */
export const toGridPosition = (aPanel: any) => ({
    x: toCoordinate(aPanel?.x, DEFAULT_POSITION.x),
    y: toCoordinate(aPanel?.y, DEFAULT_POSITION.y),
    w: toCoordinate(aPanel?.w, DEFAULT_POSITION.w),
    h: toCoordinate(aPanel?.h, DEFAULT_POSITION.h),
});

/** The `layout` prop: the placeable panels with their positions as numbers. */
export const toGridLayout = (aPanels: unknown) => getGridPanels(aPanels).map((aPanel) => ({ ...aPanel, ...toGridPosition(aPanel) }));
