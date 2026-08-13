import { Page, Toast } from '@/design-system/components';
import { gBoardList, gSelectedTab, type GBoardListType } from '@/recoil/recoil';
import { createTagAnalyzerBoardFromTagSet, TAG_ANALYZER_BRIDGE_APP_NAME } from '@/components/tagAnalyzer/integration';
import { useEffect, useRef, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { VscBook } from 'react-icons/vsc';
import { AppFrameStatus } from './AppFrameStatus';
import { useAppFrameHealth } from './useAppFrameHealth';
import { AppReadmePanel } from './AppReadmePanel';
import { useInstalledReadme } from './useInstalledReadme';

interface AppViewProps {
    pAppName: string;
    pIsActiveTab: boolean;
}

export const AppView = ({ pAppName, pIsActiveTab }: AppViewProps) => {
    const setBoardList = useSetRecoilState<GBoardListType[]>(gBoardList);
    const setSelectedTab = useSetRecoilState(gSelectedTab);
    const defaultUrl = `${window.location.origin}/public/${pAppName}/main.html`;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Mount on first activation, then never unmount. Tearing the iframe down on
    // tab switch destroyed the document, so every package reloaded from scratch
    // on the way back and lost whatever was in memory (SPA route, open socket,
    // form input). Keeping the frame alive makes that free for every package
    // instead of only the few that used to be allow-listed.
    const [sMounted, setMounted] = useState<boolean>(pIsActiveTab);
    // Drawer state is per package and survives tab switches for free: this
    // component mounts once and never unmounts (see the note above `sMounted`),
    // so coming back to a package finds its README exactly as it was left.
    const [sReadmeOpen, setReadmeOpen] = useState<boolean>(false);
    const readme = useInstalledReadme(pAppName);
    // Inspect only while the tab is on screen: a frame parked behind another tab
    // is not painted, and probing it there yields false verdicts.
    const health = useAppFrameHealth(iframeRef, { enabled: sMounted && pIsActiveTab, resetKey: pAppName });

    useEffect(() => {
        if (pIsActiveTab) setMounted(true);
    }, [pIsActiveTab]);

    useEffect(() => {
        if (pAppName !== TAG_ANALYZER_BRIDGE_APP_NAME) return;

        const handleMessage = (aEvent: MessageEvent) => {
            if (!pIsActiveTab) return;
            if (aEvent.origin !== window.location.origin) return;
            if (aEvent.source !== iframeRef.current?.contentWindow) return;

            const sResult = createTagAnalyzerBoardFromTagSet(aEvent.data, pAppName);
            if (sResult.status === 'ignored') return;
            if (sResult.status === 'error') {
                Toast.error(sResult.reason);
                return;
            }

            setBoardList((aPrev) => [...aPrev, sResult.board]);
            setSelectedTab(sResult.board.id);
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [pAppName, pIsActiveTab, setBoardList, setSelectedTab]);

    return (
        <Page>
            <Page.Header>
                {/* THE README MOVES HERE ONCE A PACKAGE IS INSTALLED. Before install it
                    is the substance of the `PKG:` detail tab; after install the package
                    has its own app, and the README becomes reference material you want
                    open BESIDE what you are doing rather than instead of it.

                    Offered only when there is one to show — `useInstalledReadme` has
                    already read `/public/{name}/README.md`, so a package that ships
                    none gets no button instead of a button onto an empty panel. */}
                {readme.readme && (
                    <button
                        type="button"
                        className={`app-view-readme-toggle${sReadmeOpen ? ' app-view-readme-toggle--on' : ''}`}
                        aria-pressed={sReadmeOpen}
                        title={sReadmeOpen ? 'Hide README' : 'Show README'}
                        onClick={() => setReadmeOpen((prev) => !prev)}
                    >
                        <VscBook size={13} />
                        README
                    </button>
                )}
            </Page.Header>
            <Page.Body fullHeight style={{ overflow: 'hidden', height: '100%' }}>
                {sMounted && (
                    <div className="app-view-stack">
                        <div className="app-frame">
                            <iframe ref={iframeRef} src={defaultUrl} title={`App: ${pAppName}`} />
                            {pIsActiveTab && <AppFrameStatus pAppName={pAppName} pHealth={health} />}
                        </div>
                        {sReadmeOpen && readme.readme && (
                            <AppReadmePanel
                                pAppName={pAppName}
                                pReadme={readme.readme}
                                pVersion={readme.version}
                                onClose={() => setReadmeOpen(false)}
                            />
                        )}
                    </div>
                )}
            </Page.Body>
        </Page>
    );
};
