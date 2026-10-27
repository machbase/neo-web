// The README drawer inside a package's `APP:` tab.
//
// AN INSTALLED PACKAGE'S README DOES NOT GET A TAB. Before install it does — the
// catalog card opens the `PKG:` detail tab, where the README is most of what
// there is to look at. After install the package has its own app, and the README
// stops being a destination and becomes reference material you want open BESIDE
// the thing you are doing. A tab cannot do that; it replaces the app you were
// reading it for.

import './AppReadmePanel.scss';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VscClose } from 'react-icons/vsc';
import { Markdown } from '@/components/worksheet/Markdown';
import { stripVPrefix } from '@/utils/version/utils';
import { clampReadmeWidth, README_PANEL_MIN_WIDTH, README_PANEL_MAX_WIDTH, useReadmePanelWidth } from './useReadmePanelWidth';

export interface AppReadmePanelProps {
    pAppName: string;
    /** Markdown source. */
    pReadme: string;
    /** `package.json` version; the badge is dropped when this is empty. */
    pVersion?: string;
    onClose: () => void;
}

/** How far one arrow-key press moves the edge. */
const KEY_STEP = 24;

// -----------------------------------------------------------------------------
// DRAWER TYPOGRAPHY
// -----------------------------------------------------------------------------
// `md.css` is GitHub's page typography: 16px body, 2em h1, generous margins. It is
// right for the detail tab, which is half a screen wide, and wrong here — measured
// in a default-width drawer the text column is 252px, so 16px prose wrapped after
// four or five words and every heading shouted.
//
// It has to be fixed with CSS INJECTED INTO THE SHADOW ROOT (`pExtraCss`) rather
// than from this file's stylesheet: md.css is applied to a wrapper that lives
// inside the shadow, where no page selector can reach it — not even one on the
// host. Appended after md.css, so equal-specificity rules win.
//
// Sizes are proportional, not absolute, everywhere below the base: the headings
// keep their relationship to the body text, they just stop being page-sized.
const DRAWER_MD_CSS = `
.markdown-body { font-size: 13px; line-height: 1.55; }
.markdown-body h1 { font-size: 1.45em; padding-bottom: .2em; margin-bottom: .6em; }
.markdown-body h2 { font-size: 1.2em; padding-bottom: .2em; margin-top: 1.2em; margin-bottom: .5em; }
.markdown-body h3 { font-size: 1.05em; margin-top: 1em; margin-bottom: .4em; }
.markdown-body h4, .markdown-body h5, .markdown-body h6 { font-size: 1em; }
.markdown-body p, .markdown-body ul, .markdown-body ol { margin-bottom: .7em; }
.markdown-body ul, .markdown-body ol { padding-left: 1.3em; }
/* A narrow column cannot also afford GitHub's 16px code padding, and long lines
   must scroll rather than push the drawer's own layout sideways. */
.markdown-body pre { padding: 8px 10px; font-size: .92em; overflow-x: auto; }
.markdown-body table { display: block; overflow-x: auto; font-size: .95em; }
`;

export const AppReadmePanel = ({ pAppName, pReadme, pVersion, onClose }: AppReadmePanelProps) => {
    const { width: sWidth, setWidth, persist } = useReadmePanelWidth();
    const [sDragging, setDragging] = useState<boolean>(false);
    const panelRef = useRef<HTMLElement | null>(null);
    // Everything the in-flight drag needs, in a REF rather than in state: the
    // window listeners below are installed once per drag and must not be torn
    // down and rebuilt on every pixel of movement.
    const dragRef = useRef<{ startX: number; startWidth: number; latestX: number; latest: number; raf: number | null }>({
        startX: 0,
        startWidth: 0,
        latestX: 0,
        latest: 0,
        raf: null,
    });

    /** Width of the area the panel floats over — the cap the drag is clamped to. */
    const containerWidth = () => (panelRef.current?.offsetParent as HTMLElement | null)?.clientWidth;

    // THE CAP IS RE-APPLIED WHENEVER THE AREA CHANGES, not only during a drag
    // (issue #1570 F-178). A width saved in a wide window used to come back
    // as-is after the window shrank or the drawer reopened, covering the whole
    // app and pushing the handle off screen. The saved preference is kept — it
    // comes back when there is room again; only the width SHOWN is capped.
    const [sContainerWidth, setContainerWidth] = useState<number | undefined>(undefined);
    // layout effect: measured before the first paint, so a reopened drawer never flashes at the saved width
    useLayoutEffect(() => {
        const sPanel = panelRef.current;
        if (!sPanel) return;
        // a hidden tab has no offsetParent and measures 0 — keep the last real width then
        const measure = () => {
            const sMeasured = containerWidth();
            if (sMeasured) setContainerWidth(sMeasured);
        };
        measure();
        window.addEventListener('resize', measure);
        const sObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        // the panel itself too: it reports when a hidden tab becomes visible again
        sObserver?.observe(sPanel);
        if (sPanel.parentElement) sObserver?.observe(sPanel.parentElement);
        return () => {
            window.removeEventListener('resize', measure);
            sObserver?.disconnect();
        };
    }, []);
    const sShownWidth = clampReadmeWidth(sWidth, sContainerWidth);

    const resizeTo = useCallback(
        (next: number) => {
            const clamped = clampReadmeWidth(next, containerWidth());
            dragRef.current.latest = clamped;
            setWidth(clamped);
        },
        [setWidth]
    );

    // -------------------------------------------------------------------------
    // THE DRAG, ON THE WINDOW — not on the handle
    // -------------------------------------------------------------------------
    // The handle used to carry `onPointerMove` / `onPointerUp` itself and lean on
    // `setPointerCapture`. Two things went wrong with that, and both showed up
    // exactly when the pointer moved FAST:
    //
    //   * a move that outran the capture (or landed while React was still
    //     committing the `dragging` state) was delivered somewhere else and simply
    //     dropped, so the panel lagged the cursor and then stopped following it;
    //   * worse, if the matching `pointerup` was one of the events that went
    //     astray, nothing ever cleared `dragging` — the invisible drag shield
    //     stayed over the whole window and swallowed every later click. That is
    //     the "orphaned" state: the app looks fine and responds to nothing.
    //
    // Listening on the WINDOW fixes both. The shield (rendered below) is a
    // same-document element covering the package's iframe, so the pointer is never
    // over a foreign document during a drag and these listeners see every event.
    useEffect(() => {
        if (!sDragging) return;

        const apply = () => {
            dragRef.current.raf = null;
            resizeTo(dragRef.current.startWidth - (dragRef.current.latestX - dragRef.current.startX));
        };

        const onMove = (e: PointerEvent) => {
            // NO BUTTON DOWN MEANS THE RELEASE WAS MISSED — the pointer came back
            // over the window after being let go somewhere we could not hear it
            // (outside the browser, over a native menu). This is the backstop that
            // makes an orphaned drag impossible rather than merely unlikely.
            if (e.buttons === 0) {
                setDragging(false);
                return;
            }
            dragRef.current.latestX = e.clientX;
            // COALESCE TO ONE UPDATE PER FRAME. A fast drag fires moves far faster
            // than React can render; without this each one queued its own render
            // and the handle fell behind the cursor.
            if (dragRef.current.raf === null) dragRef.current.raf = requestAnimationFrame(apply);
        };
        const onEnd = () => setDragging(false);

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd);
        window.addEventListener('pointercancel', onEnd);
        // Alt-tabbing mid-drag releases the button somewhere this window will never
        // hear about.
        window.addEventListener('blur', onEnd);

        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onEnd);
            window.removeEventListener('pointercancel', onEnd);
            window.removeEventListener('blur', onEnd);
            if (dragRef.current.raf !== null) {
                cancelAnimationFrame(dragRef.current.raf);
                dragRef.current.raf = null;
            }
            // ONE STORAGE WRITE PER DRAG, here at the end. Writing on every move
            // meant a fast drag issued hundreds of synchronous localStorage writes,
            // which is a large part of why it stuttered in the first place.
            persist(dragRef.current.latest);
        };
    }, [sDragging, resizeTo, persist]);

    return (
        <aside className="app-readme-panel" aria-label={`${pAppName} README`} ref={panelRef} style={{ width: sShownWidth }}>
            {/* THE DRAG HANDLE, ON THE PANEL'S LEFT EDGE. The panel is anchored to the
                right, so dragging LEFT makes it wider — hence `startWidth - delta`.
                It only STARTS the drag; the window listeners above run it. */}
            <div
                className={`app-readme-panel-resizer${sDragging ? ' app-readme-panel-resizer--active' : ''}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize README panel"
                aria-valuenow={Math.round(sShownWidth)}
                aria-valuemin={README_PANEL_MIN_WIDTH}
                aria-valuemax={README_PANEL_MAX_WIDTH}
                tabIndex={0}
                onPointerDown={(e) => {
                    // Left button only: a right-click on the handle must not start a
                    // drag that the context menu then leaves hanging.
                    if (e.button !== 0) return;
                    e.preventDefault();
                    dragRef.current = { startX: e.clientX, startWidth: sShownWidth, latestX: e.clientX, latest: sShownWidth, raf: null };
                    setDragging(true);
                }}
                // Operable without a mouse, and cheap: the handle is already focusable
                // because it has to be reachable to be a real separator.
                onKeyDown={(e) => {
                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                    e.preventDefault();
                    const next = clampReadmeWidth(sShownWidth + (e.key === 'ArrowLeft' ? KEY_STEP : -KEY_STEP), containerWidth());
                    setWidth(next);
                    // Keyboard resizing has no "drag end", so it persists per press.
                    persist(next);
                }}
            />
            <div className="app-readme-panel-head">
                <span className="app-readme-panel-title">README</span>
                {pVersion ? <span className="app-readme-panel-version">v{stripVPrefix(pVersion)}</span> : null}
                <button type="button" className="app-readme-panel-close" aria-label="Close README" title="Close README" onClick={onClose}>
                    <VscClose size={14} />
                </button>
            </div>
            {/* The body scrolls, the head does not — the same rule the App Store panel
                follows, and for the same reason: a README is long and the thing that
                tells you what you are reading must not scroll away from it. */}
            <div className="app-readme-panel-body">
                <Markdown pIdx={1} pContents={pReadme} pType="mrk" pExtraCss={DRAWER_MD_CSS} />
            </div>
            {/* A TRANSPARENT SHEET OVER EVERYTHING, ONLY WHILE DRAGGING.
                This is what makes the window listeners above work at all: without it
                the pointer crosses into the package's iframe, whose events belong to
                a different document and never reach us. It also keeps `col-resize`
                on screen and stops the frame reacting to a gesture that is not for
                it. */}
            {sDragging && <div className="app-readme-panel-drag-shield" />}
        </aside>
    );
};
