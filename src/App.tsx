import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { Routes } from '@/Routes';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { setMonacoConfig } from './plugin/monaco';
import { initMermaid } from './plugin/mermaid';
import { THEME_CHANGE_EVENT } from './design-system/theme';
import ErrorBoundary from '@/components/ErrorBoundary';
import LegacyBrowserNotice from '@/components/LegacyBrowserNotice';

setMonacoConfig();

const App = () => {
    initMermaid();
    // Mermaid's palette follows the scheme; diagrams already drawn redraw themselves (Markdown).
    useEffect(() => {
        window.addEventListener(THEME_CHANGE_EVENT, initMermaid);
        return () => window.removeEventListener(THEME_CHANGE_EVENT, initMermaid);
    }, []);
    return (
        <ErrorBoundary>
            <LegacyBrowserNotice />
            <RecoilRoot>
                <BrowserRouter basename="/web/ui" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes />
                </BrowserRouter>
                <Toaster position="top-right" />
            </RecoilRoot>
        </ErrorBoundary>
    );
};

export default App;
