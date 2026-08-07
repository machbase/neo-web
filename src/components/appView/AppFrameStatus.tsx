import './AppFrameStatus.scss';
import { useEffect, useState } from 'react';
import { VscWarning } from 'react-icons/vsc';
import { Loader } from '@/components/loader';
import type { AppFrameFailure, AppFrameHealth } from './useAppFrameHealth';

const MAX_LISTED_RESOURCES = 5;

/**
 * The cover itself is up from the first paint (see below), but the spinner only
 * joins it once the frame is genuinely slow — a normal load clears well inside
 * this window, so switching tabs never flashes a spinner.
 */
const SPINNER_DELAY_MS = 2500;

const FAILURE_COPY: Record<AppFrameFailure, { title: string; desc: string }> = {
    timeout: {
        title: 'This app did not finish loading',
        desc: 'The page was requested but never finished loading. The package may be serving a document that hangs, or the server stopped responding.',
    },
    resource: {
        title: 'This app failed to load its resources',
        desc: 'The page was served, but scripts or stylesheets it depends on returned an error. The package build is likely incomplete or was published without its bundle.',
    },
    blank: {
        title: 'This app rendered nothing',
        desc: 'The page was served but contains no runnable content — only an empty shell. The package build is likely missing from the published release.',
    },
};

interface AppFrameStatusProps {
    pAppName: string;
    pHealth: AppFrameHealth;
    /** Tight layouts (the side panel) hide the resource list and shrink the text. */
    pCompact?: boolean;
}

export const AppFrameStatus = ({ pAppName, pHealth, pCompact = false }: AppFrameStatusProps) => {
    const { status, failure, failedResources, reload } = pHealth;
    const [sShowSpinner, setShowSpinner] = useState<boolean>(false);

    useEffect(() => {
        if (status !== 'loading') {
            setShowSpinner(false);
            return;
        }
        const sTimer = window.setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
        return () => window.clearTimeout(sTimer);
    }, [status]);

    // A document with no stylesheet of its own paints on the browser's white
    // canvas, which flashes against the dark app before the verdict lands. The
    // cover is opaque from the first frame so that white is never seen; it is
    // the same colour as an empty tab, so a healthy app just reveals itself.
    if (status === 'loading') {
        return (
            <div className={`app-frame-overlay${pCompact ? ' app-frame-overlay--compact' : ''}`}>
                {sShowSpinner && (
                    <>
                        <Loader width="24px" height="24px" />
                        <span className="app-frame-overlay__spinner-text">Loading {pAppName}…</span>
                    </>
                )}
            </div>
        );
    }

    if (status !== 'error' || !failure) return null;

    const sListed = failedResources.slice(0, MAX_LISTED_RESOURCES);
    const sHidden = failedResources.length - sListed.length;

    return (
        <div className={`app-frame-overlay${pCompact ? ' app-frame-overlay--compact' : ''}`}>
            <VscWarning className="app-frame-overlay__icon" size={pCompact ? 20 : 28} />
            <span className="app-frame-overlay__title">{FAILURE_COPY[failure].title}</span>
            <p className="app-frame-overlay__desc">{FAILURE_COPY[failure].desc}</p>
            {sListed.length > 0 && (
                <ul className="app-frame-overlay__resources">
                    {sListed.map((aUrl) => (
                        <li key={aUrl} title={aUrl}>
                            {aUrl}
                        </li>
                    ))}
                    {sHidden > 0 && <li className="app-frame-overlay__resources-more">+{sHidden} more</li>}
                </ul>
            )}
            <button type="button" className="app-frame-overlay__btn app-frame-overlay__btn--primary" onClick={reload}>
                Reload
            </button>
        </div>
    );
};
