import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { Routes } from '@/Routes';
import mermaid from 'mermaid';
import { Toaster } from 'react-hot-toast';
import { setMonacoConfig } from './plugin/monaco';
// 부팅 시 ?echarts= 플래그를 잡아둔다 — 로그인 리다이렉트가 쿼리스트링을 지우기 전에.
import './plugin/echartsV6Preview';
import ErrorBoundary from '@/components/ErrorBoundary';
import LegacyBrowserNotice from '@/components/LegacyBrowserNotice';

setMonacoConfig();

const App = () => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
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
