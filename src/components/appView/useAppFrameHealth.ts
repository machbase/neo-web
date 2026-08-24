import { useCallback, useEffect, useRef, useState } from 'react';

export type AppFrameStatus = 'loading' | 'ok' | 'error';

/**
 * - `timeout`  : the document never fired `load` within the grace period
 * - `resource` : the document rendered nothing and a script / stylesheet it
 *                depends on returned an error
 * - `blank`    : the document rendered nothing with no failed request to blame
 *                (e.g. a package that ships an empty `<div id="root"></div>`
 *                shell without its bundle)
 */
export type AppFrameFailure = 'timeout' | 'resource' | 'blank';

export interface AppFrameHealth {
    status: AppFrameStatus;
    failure: AppFrameFailure | null;
    failedResources: string[];
    reload: () => void;
}

interface AppFrameHealthOptions {
    /** Only inspect while the frame is actually visible — a hidden frame reports bogus geometry. */
    enabled?: boolean;
    /** Reset the check when the document being framed changes. */
    resetKey?: string;
    /** How long to wait for the `load` event before calling it a timeout. */
    loadTimeoutMs?: number;
    /** How long an SPA gets to paint something before the document counts as blank. */
    settleMs?: number;
}

/** How often the document is re-checked while waiting for it to paint. */
const POLL_MS = 150;

/** Resource types whose failure explains an empty page, rather than just looking worse. */
const isFatalResource = (entry: PerformanceResourceTiming): boolean => {
    if (entry.initiatorType === 'script') return true;
    return entry.initiatorType === 'link' && /\.css(\?|$)/.test(entry.name);
};

const collectFailedResources = (frameWindow: Window): { all: string[]; fatal: boolean } => {
    const sAll: string[] = [];
    let sFatal = false;
    let sEntries: PerformanceEntryList = [];
    try {
        sEntries = frameWindow.performance?.getEntriesByType?.('resource') ?? [];
    } catch {
        return { all: sAll, fatal: sFatal };
    }
    sEntries.forEach((aEntry) => {
        const sEntry = aEntry as PerformanceResourceTiming & { responseStatus?: number };
        // responseStatus is Chromium-only; where it is missing we simply cannot
        // tell a 404 from a cache hit, so we skip rather than guess.
        if (typeof sEntry.responseStatus !== 'number' || sEntry.responseStatus < 400) return;
        sAll.push(sEntry.name);
        if (isFatalResource(sEntry)) sFatal = true;
    });
    return { all: sAll, fatal: sFatal };
};

/**
 * A document counts as blank when it renders no text and no visual element.
 * The check runs against a clone with `<script>`/`<style>` stripped so that
 * inline code is not mistaken for content, and it reads `textContent` rather
 * than `innerText` so the result does not depend on the frame being painted.
 */
const isBlankDocument = (frameDocument: Document): boolean => {
    const sBody = frameDocument.body;
    if (!sBody) return true;
    const sClone = sBody.cloneNode(true) as HTMLElement;
    sClone.querySelectorAll('script, style, template, noscript, link, meta').forEach((aNode) => aNode.remove());
    if ((sClone.textContent ?? '').trim().length > 0) return false;
    return sClone.querySelector('img, svg, canvas, video, iframe, input, button, textarea, select') === null;
};

export const useAppFrameHealth = (
    pIframeRef: React.RefObject<HTMLIFrameElement>,
    { enabled = true, resetKey, loadTimeoutMs = 15000, settleMs = 1200 }: AppFrameHealthOptions = {}
): AppFrameHealth => {
    const [sStatus, setStatus] = useState<AppFrameStatus>('loading');
    const [sFailure, setFailure] = useState<AppFrameFailure | null>(null);
    const [sFailedResources, setFailedResources] = useState<string[]>([]);

    const sLoadTimerRef = useRef<number>(0);
    const sPollTimerRef = useRef<number>(0);
    // URL of the document this hook already reached a verdict on. Leaving and
    // re-entering the tab re-runs the effect against that same live document,
    // and re-judging it would replay the cover over content that is fine.
    const sJudgedHrefRef = useRef<string | null>(null);

    const readHref = useCallback((): string | null => {
        try {
            return pIframeRef.current?.contentWindow?.location.href ?? null;
        } catch {
            return null;
        }
    }, [pIframeRef]);

    const clearTimers = useCallback(() => {
        window.clearTimeout(sLoadTimerRef.current);
        window.clearInterval(sPollTimerRef.current);
        sLoadTimerRef.current = 0;
        sPollTimerRef.current = 0;
    }, []);

    const armLoadTimeout = useCallback(() => {
        window.clearTimeout(sLoadTimerRef.current);
        sLoadTimerRef.current = window.setTimeout(() => {
            setStatus('error');
            setFailure('timeout');
        }, loadTimeoutMs);
    }, [loadTimeoutMs]);

    const reload = useCallback(() => {
        const sFrame = pIframeRef.current;
        if (!sFrame) return;
        clearTimers();
        sJudgedHrefRef.current = null;
        setStatus('loading');
        setFailure(null);
        setFailedResources([]);
        armLoadTimeout();
        try {
            sFrame.contentWindow?.location.reload();
        } catch {
            // Cross-origin frame: re-assigning src restarts the navigation instead.
            const sSrc = sFrame.src;
            sFrame.src = 'about:blank';
            sFrame.src = sSrc;
        }
    }, [pIframeRef, clearTimers, armLoadTimeout]);

    useEffect(() => {
        if (!enabled) return;
        const sFrame = pIframeRef.current;
        if (!sFrame) return;

        let sDetachFrameWindow: (() => void) | undefined;

        const handleLoad = () => {
            window.clearTimeout(sLoadTimerRef.current);
            sJudgedHrefRef.current = null;
            setFailure(null);
            setFailedResources([]);
            setStatus('loading');

            let sFrameWindow: Window | null = null;
            let sFrameDocument: Document | null = null;
            try {
                sFrameWindow = sFrame.contentWindow;
                sFrameDocument = sFrame.contentDocument;
            } catch {
                sFrameWindow = null;
            }
            // Cross-origin document — nothing is inspectable, so do not accuse it.
            if (!sFrameWindow || !sFrameDocument) {
                setStatus('ok');
                return;
            }
            const sWindow = sFrameWindow;
            const sDocument = sFrameDocument;

            // Late failures (lazy chunks, dynamic imports) are recorded so a blank
            // verdict can name them, but never decide the verdict on their own —
            // a page that renders fine is not broken because one request failed.
            sDetachFrameWindow?.();
            const handleFrameError = (aEvent: Event) => {
                const sTarget = aEvent.target as (HTMLElement & { src?: string; href?: string }) | null;
                if (!sTarget || sTarget === (sWindow as unknown as HTMLElement)) return;
                const sUrl = sTarget.src || sTarget.href;
                if (!sUrl) return;
                setFailedResources((aPrev) => (aPrev.includes(sUrl) ? aPrev : [...aPrev, sUrl]));
            };
            sWindow.addEventListener('error', handleFrameError, true);
            sDetachFrameWindow = () => sWindow.removeEventListener('error', handleFrameError, true);

            // Poll rather than wait out the whole settle window: a healthy app is
            // cleared within a tick of painting, so the cover over it is brief.
            const sMaxTicks = Math.max(1, Math.ceil(settleMs / POLL_MS));
            let sTicks = 0;

            const settle = (aStatus: AppFrameStatus, aFailure: AppFrameFailure | null, aResources?: string[]) => {
                window.clearInterval(sPollTimerRef.current);
                sPollTimerRef.current = 0;
                sJudgedHrefRef.current = readHref();
                if (aResources?.length) setFailedResources((aPrev) => [...new Set([...aPrev, ...aResources])]);
                setFailure(aFailure);
                setStatus(aStatus);
            };

            const tick = () => {
                sTicks += 1;
                let sBlank: boolean;
                let sResult: { all: string[]; fatal: boolean };
                try {
                    sBlank = isBlankDocument(sDocument);
                    sResult = collectFailedResources(sWindow);
                } catch {
                    // The document navigated away mid-check; the next load re-runs this.
                    settle('ok', null);
                    return;
                }
                if (!sBlank) {
                    settle('ok', null);
                    return;
                }
                if (sTicks >= sMaxTicks) settle('error', sResult.fatal ? 'resource' : 'blank', sResult.all);
            };

            window.clearInterval(sPollTimerRef.current);
            sPollTimerRef.current = window.setInterval(tick, POLL_MS);
            tick();
        };

        // A frame that already finished loading before this effect ran fires no
        // further `load` event, so inspect it directly instead of waiting.
        let sAlreadyLoaded = false;
        try {
            sAlreadyLoaded = sFrame.contentDocument?.readyState === 'complete';
        } catch {
            sAlreadyLoaded = false;
        }

        sFrame.addEventListener('load', handleLoad);
        if (!sAlreadyLoaded) armLoadTimeout();
        // Re-entering the tab lands on a document that was already judged — keep
        // that verdict rather than replaying the whole check.
        else if (sJudgedHrefRef.current === null || sJudgedHrefRef.current !== readHref()) handleLoad();

        return () => {
            sFrame.removeEventListener('load', handleLoad);
            sDetachFrameWindow?.();
            clearTimers();
        };
    }, [enabled, resetKey, pIframeRef, armLoadTimeout, clearTimers, readHref, settleMs]);

    return { status: sStatus, failure: sFailure, failedResources: sFailedResources, reload };
};
