import { Page } from '@/design-system/components';

// Packages that should stay alive even when the tab is inactive
const KEEP_ALIVE_PACKAGES = ['neo-pkg-llm-chat'];

interface AppViewProps {
    pAppName: string;
    pIsActiveTab: boolean;
}

export const AppView = ({ pAppName, pIsActiveTab }: AppViewProps) => {
    const appUrl = `${window.location.origin}/public/${pAppName}/main.html`;
    const keepAlive = KEEP_ALIVE_PACKAGES.includes(pAppName);
    const shouldRender = pIsActiveTab || keepAlive;

    return (
        <Page>
            <Page.Header />
            <Page.Body fullHeight style={{ overflow: 'hidden', height: '100%' }}>
                {shouldRender && <iframe src={appUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={`App: ${pAppName}`} />}
            </Page.Body>
        </Page>
    );
};
