import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { Routes } from '@/Routes';
import mermaid from 'mermaid';

const App = () => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    return (
        <RecoilRoot>
            <BrowserRouter basename="/web/ui">
                <Routes />
            </BrowserRouter>
        </RecoilRoot>
    );
};

export default App;
