import { useEffect, useRef } from 'react';

interface ShadowContentProps {
    html: string;
    styles?: string;
    className?: string;
    onShadowRootCreated?: (shadowRoot: ShadowRoot) => void;
    onContentUpdated?: (shadowRoot: ShadowRoot) => void;
}

export const ShadowContent = ({
    html,
    styles = '',
    className = '',
    onShadowRootCreated,
    onContentUpdated,
}: ShadowContentProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);
    // The <style> and the content wrapper are tracked separately so a content update swaps ONLY
    // the wrapper. Wiping the whole shadow would also delete nodes that the injected bootstrap
    // scripts appended to it — notably geomapext's `<link rel="stylesheet">` for leaflet.css,
    // which it injects into the shadow root because a document.head stylesheet cannot reach past
    // the shadow boundary. Its "already loaded" cache lives on the ShadowRoot as an expando
    // (`__geomapextCSSPromises`), so it SURVIVES the wipe and then suppresses re-injection: the
    // map re-renders with no Leaflet CSS at all (panes lose `position:absolute` so tiles stack in
    // document flow, `.leaflet-container` loses `overflow:hidden`, pane z-indexes vanish so
    // markers/popups hide behind tiles, and zoom controls drop out of the map). Keeping the
    // <style> alive also avoids re-parsing ~27KB of md.css on every content update.
    const styleRef = useRef<HTMLStyleElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    // Keep the latest callbacks in refs so their (unstable) identity does NOT feed the
    // content-update effect deps. Otherwise every parent re-render would recreate these
    // callbacks, re-run the effect, wipe & re-inject the shadow DOM, and force charts/mermaid
    // to fully dispose + redraw even though `html` never changed.
    const onShadowRootCreatedRef = useRef(onShadowRootCreated);
    const onContentUpdatedRef = useRef(onContentUpdated);
    onShadowRootCreatedRef.current = onShadowRootCreated;
    onContentUpdatedRef.current = onContentUpdated;

    // Create Shadow DOM only once
    useEffect(() => {
        if (!containerRef.current || shadowRootRef.current) return;

        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });

        // Call callback
        onShadowRootCreatedRef.current?.(shadowRootRef.current);
    }, []);

    // Styles get their own <style>, created once and updated in place.
    useEffect(() => {
        if (!shadowRootRef.current) return;
        if (!styles && !styleRef.current) return;

        if (!styleRef.current) {
            styleRef.current = document.createElement('style');
            // Prepend so the content wrapper — and any stylesheet a bootstrap script appends
            // later, e.g. leaflet.css — stays after it and keeps winning cascade ties.
            shadowRootRef.current.prepend(styleRef.current);
        }
        styleRef.current.textContent = styles;
    }, [styles]);

    // Rebuild only the content wrapper when the content itself changes.
    useEffect(() => {
        if (!shadowRootRef.current) return;

        const shadow = shadowRootRef.current;

        // Add HTML content
        const wrapper = document.createElement('div');
        if (className) {
            wrapper.className = className;
        }
        wrapper.innerHTML = html;

        // Add overflow control and image sizing
        wrapper.style.overflowX = 'hidden';
        wrapper.style.width = '100%';

        // Fix image sizes
        const images = wrapper.querySelectorAll('img');
        images.forEach((img) => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.boxSizing = 'border-box';
        });

        // Swap in place. replaceChild keeps the wrapper's position among the shadow's children,
        // so the <style> stays before it and bootstrap-injected nodes stay after it.
        if (wrapperRef.current && wrapperRef.current.parentNode === shadow) {
            shadow.replaceChild(wrapper, wrapperRef.current);
        } else {
            shadow.appendChild(wrapper);
        }
        wrapperRef.current = wrapper;

        onContentUpdatedRef.current?.(shadow);
    }, [html, className]);

    return <div ref={containerRef} style={{ width: '100%', display: 'block' }} />;
};
