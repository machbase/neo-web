import { Page, Toast } from '@/design-system/components';
import { gBoardList, gSelectedTab, type GBoardListType } from '@/recoil/recoil';
import { createTagAnalyzerBoardFromTagSet, TAG_ANALYZER_BRIDGE_APP_NAME } from '@/components/tagAnalyzer/integration';
import { useEffect, useRef, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { AppFrameStatus } from './AppFrameStatus';
import { useAppFrameHealth } from './useAppFrameHealth';

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
            <Page.Header />
            <Page.Body fullHeight style={{ overflow: 'hidden', height: '100%' }}>
                {sMounted && (
                    <div className="app-frame">
                        <iframe ref={iframeRef} src={defaultUrl} title={`App: ${pAppName}`} />
                        {pIsActiveTab && <AppFrameStatus pAppName={pAppName} pHealth={health} />}
                    </div>
                )}
            </Page.Body>
        </Page>
    );
};
