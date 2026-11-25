import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './design-system/global.scss';
import { applyThemeState, checkThemeOwner, listenForThemeState } from './design-system/theme';
import { listenForCursorFx } from './design-system/theme/cursorFx';

// Prevent unhandled promise rejections from causing a blank screen
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    event.preventDefault();
});

// Before the first render, so the theme in use paints from the first frame.
applyThemeState();
// The Theme Builder writes the theme state; the page follows it (another tab included).
listenForThemeState();
// A state whose owner was uninstalled since is not worn.
void checkThemeOwner();
// A theme can switch on a built-in pointer effect (Cyberpunk's Sandevistan trail).
listenForCursorFx();

ReactDOM.createRoot(document.getElementById('root')!).render(<App></App>);
