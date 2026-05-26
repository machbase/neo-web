import { useState, useCallback } from 'react';
import { needsLegacyBrowserNotice } from './featureDetection';
import './index.scss';

const COLLAPSED_KEY = 'legacy-browser-notice-collapsed';

const isInitiallyCollapsed = (): boolean => {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
};

const LegacyBrowserNotice = () => {
    // This component is mounted as a direct child of <ErrorBoundary>. If it ever
    // throws during render, the whole-app fallback fires, which would mask the
    // very legacy-browser failures this banner exists to surface. We therefore
    // wrap the entire body in try/catch and silently render nothing on error.
    /* eslint-disable react-hooks/rules-of-hooks */
    try {
        const [needsNotice] = useState<boolean>(() => needsLegacyBrowserNotice());
        const [collapsed, setCollapsed] = useState<boolean>(() => isInitiallyCollapsed());

        const handleCollapse = useCallback(() => {
            try {
                localStorage.setItem(COLLAPSED_KEY, '1');
            } catch {
                // Ignore — private mode or storage blocked
            }
            setCollapsed(true);
        }, []);

        const handleExpand = useCallback(() => {
            try {
                localStorage.setItem(COLLAPSED_KEY, '0');
            } catch {
                // Ignore — private mode or storage blocked
            }
            setCollapsed(false);
        }, []);

        if (!needsNotice) return null;

        if (collapsed) {
            return (
                <button
                    type="button"
                    className="legacy-browser-notice-chip"
                    onClick={handleExpand}
                    aria-label="Show browser compatibility notice"
                    title="Browser not fully supported — click for details"
                >
                    <span aria-hidden="true">⚠</span>
                </button>
            );
        }

        return (
            <div className="legacy-browser-notice" role="alert">
                <span className="legacy-browser-notice__text">
                    Your browser is not fully supported. Please update to Chrome/Edge 105+, Firefox 121+, or Safari 15.4+. Some features may not work correctly.
                </span>
                <button
                    type="button"
                    className="legacy-browser-notice__dismiss"
                    onClick={handleCollapse}
                    aria-label="Collapse notice"
                    title="Collapse"
                >
                    ×
                </button>
            </div>
        );
    } catch {
        return null;
    }
    /* eslint-enable react-hooks/rules-of-hooks */
};

export default LegacyBrowserNotice;
