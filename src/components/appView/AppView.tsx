import { Page } from '@/design-system/components';
import { useEffect, useRef } from 'react';

// Per-package URL cache to preserve iframe location across tab deactivation
const urlCache = new Map<string, string>();

// Packages whose iframe must stay mounted across tab switches so in-memory
// state (e.g. an LLM chat conversation, open WebSocket) survives deactivation.
// Add a package name here when its document loses meaningful state on reload.
const PERSISTENT_PACKAGES = new Set<string>(['neo-pkg-llm-chat']);

interface AppViewProps {
    pAppName: string;
    pIsActiveTab: boolean;
}

export const AppView = ({ pAppName, pIsActiveTab }: AppViewProps) => {
    const defaultUrl = `${window.location.origin}/public/${pAppName}/main.html`;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const initialSrc = urlCache.get(pAppName) ?? defaultUrl;
    const persistTab = PERSISTENT_PACKAGES.has(pAppName);
    const shouldRender = persistTab || pIsActiveTab;

    useEffect(() => {
        // URL polling only for non-persistent packages: they unmount/remount on
        // tab switch and rely on urlCache to land on the previous SPA route.
        // Persistent iframes never unmount within the tab lifetime, so polling
        // would be wasteful background work.
        if (persistTab || !pIsActiveTab) return;
        const captureUrl = () => {
            try {
                const href = iframeRef.current?.contentWindow?.location.href;
                if (href && href !== 'about:blank') urlCache.set(pAppName, href);
            } catch {
                // Cross-origin access denied; ignore
            }
        };
        const intervalId = window.setInterval(captureUrl, 500);
        return () => {
            captureUrl();
            window.clearInterval(intervalId);
        };
    }, [persistTab, pIsActiveTab, pAppName]);

    return (
        <Page>
            <Page.Header />
            <Page.Body fullHeight style={{ overflow: 'hidden', height: '100%' }}>
                {shouldRender && <iframe ref={iframeRef} src={initialSrc} style={{ width: '100%', height: '100%', border: 'none' }} title={`App: ${pAppName}`} />}
            </Page.Body>
        </Page>
    );
};
