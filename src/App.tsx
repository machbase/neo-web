import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { Routes } from '@/Routes';
import mermaid from 'mermaid';
import { Toaster } from 'react-hot-toast';
import { setMonacoConfig } from './plugin/monaco';
import ErrorBoundary from '@/components/ErrorBoundary';

setMonacoConfig();

const App = () => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    return (
        <ErrorBoundary>
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
