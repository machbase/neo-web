import { LayoutNode } from './layoutModel';

/**
 * What is being dragged on the New tab: a node already on the board, or a new one from the widget
 * panel. HTML drag events cannot carry objects, and board and panel are separate components, so
 * the payload is held here for the length of one drag.
 */
export type DragPayload = { from: 'board'; id: string } | { from: 'panel'; create: () => LayoutNode };

let sDrag: DragPayload | undefined;
export const setLayoutDrag = (aPayload: DragPayload | undefined) => {
    sDrag = aPayload;
};
export const getLayoutDrag = () => sDrag;
