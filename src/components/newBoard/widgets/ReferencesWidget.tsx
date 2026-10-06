import { useEffect, useState } from 'react';
import { VscCloudDownload } from 'react-icons/vsc';
import icons from '@/utils/icons';
import { Loader } from '@/components/loader';
import { fetchReferences, isQuickInstallable, openReferenceUrl, REFERENCE_GROUP, REFERENCE_ITEM, useQuickInstall } from '@/components/side/Reference/referenceActions';

/** Which of the server's reference lists (/api/refs, matched by label) a widget shows. */
export type ReferenceListLabel = 'REFERENCES' | 'SDK';

// One request for every reference widget on the page; a failed one is dropped so the next mount retries.
let sRefsRequest: Promise<REFERENCE_GROUP[]> | undefined;
const loadReferences = () => {
    sRefsRequest ??= fetchReferences().catch((aError) => {
        sRefsRequest = undefined;
        throw aError;
    });
    return sRefsRequest;
};

const hostOf = (aAddress: string) => {
    try {
        return new URL(aAddress).hostname.replace(/^www\./, '');
    } catch {
        return aAddress;
    }
};

/**
 * Links from the References side panel's lists (docs, SDKs ...), as the server serves them. Opening
 * and Quick install are the panel's own, so an entry behaves the same in both places.
 */
export const ReferencesWidget = ({ pLabel }: { pLabel: ReferenceListLabel }) => {
    const [sState, setState] = useState<{ status: 'loading' } | { status: 'ready'; items: REFERENCE_ITEM[] } | { status: 'error' }>({ status: 'loading' });
    const { install, isInstalling } = useQuickInstall();

    useEffect(() => {
        let sAlive = true;
        loadReferences()
            .then((aRefs) => {
                // Only links: other lists (cheat sheets, templates) open as tabs and are not handled here.
                const sItems = aRefs.find((aRef) => aRef?.label?.toUpperCase() === pLabel)?.items?.filter((aItem) => aItem?.type === 'url') ?? [];
                if (sAlive) setState({ status: 'ready', items: sItems });
            })
            .catch(() => sAlive && setState({ status: 'error' }));
        return () => {
            sAlive = false;
        };
    }, [pLabel]);

    if (sState.status !== 'ready' || !sState.items.length) {
        return (
            <div className="nb-tile nb-refs nb-refs--empty" data-testid="new-board-refs">
                {sState.status === 'loading' ? 'Loading…' : sState.status === 'error' ? 'Could not load the list from the server.' : 'The server lists no links here.'}
            </div>
        );
    }

    return (
        <div className="nb-tile nb-refs" data-testid="new-board-refs">
            {sState.items.map((aItem) => (
                <div className="nb-ref" key={aItem.address}>
                    <button type="button" className="nb-ref-open" title={`Open ${aItem.address}`} onClick={() => openReferenceUrl(aItem)}>
                        <span className="nb-ref-icon">{icons(aItem.type)}</span>
                        <span className="nb-ref-text">
                            <b>{aItem.title}</b>
                            <small>{hostOf(aItem.address)}</small>
                        </span>
                    </button>
                    {isQuickInstallable(aItem.title) ? (
                        <button
                            type="button"
                            className="nb-icon-btn nb-ref-install"
                            title={`Quick install: clone ${aItem.title} into the server's files`}
                            aria-label={`Quick install ${aItem.title}`}
                            disabled={isInstalling(aItem)}
                            onClick={() => install(aItem)}
                        >
                            {isInstalling(aItem) ? <Loader width="14px" height="14px" /> : <VscCloudDownload size={16} />}
                        </button>
                    ) : null}
                </div>
            ))}
        </div>
    );
};
