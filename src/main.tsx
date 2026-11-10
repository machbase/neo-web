import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './design-system/global.scss';
import { applyStoredTheme, listenForThemeRequests } from './design-system/theme';
import { listenForCursorFx } from './design-system/theme/cursorFx';

// Prevent unhandled promise rejections from causing a blank screen
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    event.preventDefault();
});

// Before the first render, so a chosen theme paints from the first frame.
applyStoredTheme();
// The theme builder (an app tab) previews and applies themes through messages.
listenForThemeRequests();
// A theme can switch on a built-in pointer effect (Cyberpunk's Sandevistan trail).
listenForCursorFx();

ReactDOM.createRoot(document.getElementById('root')!).render(<App></App>);
