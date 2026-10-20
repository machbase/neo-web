import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Marks the wrapper so `useOutsideCloseGuard` can tell a press inside a dialog from one outside. */
export const DATA_VIEWER_PORTAL_CLASS = 'neo-data-viewer-portal';

/**
 * Take a dialog out to `<body>`, still inside `.neo-data-viewer`.
 *
 * Rendered in place, a dialog's overlay is `position: fixed` but is still painted inside whatever
 * stacking context its ancestors establish — so the app shell's splitter and the page's own panel
 * borders draw straight through it. This is the same wrapper the page's range editor already uses
 * for the same reason; the class stays because every rule and design token these dialogs read is
 * scoped to it, and `display: contents` keeps the wrapper itself out of layout so it does not
 * become a stray full-height box on `<body>`.
 */
export const DataViewerModalPortal = ({ children }: { children: ReactNode }) =>
    createPortal(<div className={`neo-data-viewer ${DATA_VIEWER_PORTAL_CLASS}`}>{children}</div>, document.body);

export default DataViewerModalPortal;
