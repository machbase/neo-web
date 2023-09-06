import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { Routes } from '@/Routes';
import mermaid from 'mermaid';
import { Toaster } from 'react-hot-toast';
import { setMonacoConfig } from './plugin/monaco';

setMonacoConfig();

const App = () => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    return (
        <RecoilRoot>
            <BrowserRouter basename="/web/ui">
                <Routes />
            </BrowserRouter>
            <Toaster position="top-right" />
        </RecoilRoot>
    );
};

export default App;
