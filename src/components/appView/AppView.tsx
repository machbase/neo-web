import { Page } from '@/design-system/components';
import { useEffect, useRef } from 'react';

// Per-package URL cache to preserve iframe location across tab deactivation
const urlCache = new Map<string, string>();

interface AppViewProps {
    pAppName: string;
    pIsActiveTab: boolean;
}

export const AppView = ({ pAppName, pIsActiveTab }: AppViewProps) => {
    const defaultUrl = `${window.location.origin}/public/${pAppName}/main.html`;
    const shouldRender = pIsActiveTab;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const initialSrc = urlCache.get(pAppName) ?? defaultUrl;

    useEffect(() => {
        if (!shouldRender) return;
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
    }, [shouldRender, pAppName]);

    return (
        <Page>
            <Page.Header />
            <Page.Body fullHeight style={{ overflow: 'hidden', height: '100%' }}>
                {shouldRender && <iframe ref={iframeRef} src={initialSrc} style={{ width: '100%', height: '100%', border: 'none' }} title={`App: ${pAppName}`} />}
            </Page.Body>
        </Page>
    );
};
