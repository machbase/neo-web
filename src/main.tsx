import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './design-system/global.scss';

// Prevent unhandled promise rejections from causing a blank screen
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event.reason);
    event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')!).render(<App></App>);
