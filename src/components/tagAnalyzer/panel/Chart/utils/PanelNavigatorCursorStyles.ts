import type {
    PanelChartInstance,
    PanelChartZrElement,
} from '../types/PanelChartRuntimeTypes';

const NAVIGATOR_BODY_CURSOR = 'grab';
const NAVIGATOR_BODY_ACTIVE_CURSOR = 'grabbing';
const NAVIGATOR_EDGE_CURSOR = 'ew-resize';

function setCursor(element: PanelChartZrElement, cursor: string): void {
    element.attr?.({ cursor });
    element.cursor = cursor;
}

function setNavigatorElementCursor(
    element: PanelChartZrElement,
    cursor: string,
    activeCursor = cursor,
): void {
    if (element.__tagAnalyzerNavigatorCursor === cursor) {
        setCursor(element, cursor);
        return;
    }

    element.__tagAnalyzerNavigatorCursor = cursor;
    element.on?.('mousedown', () => setCursor(element, activeCursor));
    element.on?.('mouseup', () => setCursor(element, cursor));
    element.on?.('mouseout', () => setCursor(element, cursor));
    element.on?.('dragend', () => setCursor(element, cursor));
    setCursor(element, cursor);
}

export function applyPanelNavigatorCursorStyles(
    instance: PanelChartInstance | undefined,
): void {
    const sDisplayList = instance?.getZr?.()?.storage?.getDisplayList?.();

    if (!sDisplayList) {
        return;
    }

    for (const element of sDisplayList) {
        if (!element.draggable || element.cursor !== NAVIGATOR_EDGE_CURSOR) {
            continue;
        }

        if (element.type === 'rect') {
            setNavigatorElementCursor(
                element,
                NAVIGATOR_BODY_CURSOR,
                NAVIGATOR_BODY_ACTIVE_CURSOR,
            );
            continue;
        }

        if (element.type === 'path') {
            setNavigatorElementCursor(element, NAVIGATOR_EDGE_CURSOR);
        }
    }
}
