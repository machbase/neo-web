/**
 * ShadowContent regression test.
 *
 * A content update must swap ONLY the content wrapper. The previous implementation wiped every
 * child of the shadow root, which also deleted the `<link rel="stylesheet">` that the geomapext
 * bootstrap injects into the shadow root for leaflet.css (a document.head stylesheet cannot reach
 * past the shadow boundary). Its "already loaded" cache is an expando on the ShadowRoot object,
 * so it SURVIVED the wipe and then suppressed re-injection — maps re-rendered with no Leaflet CSS
 * at all. Keeping the <style> alive additionally avoids re-parsing ~27KB of md.css per update.
 */
import { render } from '@testing-library/react';
import { ShadowContent } from './ShadowContent';

const STYLES = '.markdown-body { color: red; }';
const LEAFLET_CSS = '/web/geomap/leaflet.css';

const shadowOf = (container: HTMLElement) =>
    (container.firstElementChild as HTMLElement).shadowRoot as ShadowRoot;

// Mimic the geomapext bootstrap: append its own stylesheet to the shadow root and record it as
// loaded on an expando that no DOM removal can clear.
const injectLeafletCss = (shadow: ShadowRoot) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    shadow.appendChild(link);
    (shadow as any).__geomapextCSSPromises = { [LEAFLET_CSS]: Promise.resolve() };
    return link;
};

describe('ShadowContent content update', () => {
    it('keeps bootstrap-injected nodes and reuses the <style>', () => {
        const { container, rerender } = render(
            <ShadowContent html="<p>first</p>" styles={STYLES} className="markdown-body" />,
        );

        const shadow = shadowOf(container);
        const styleBefore = shadow.querySelector('style');
        expect(styleBefore?.textContent).toBe(STYLES);

        const link = injectLeafletCss(shadow);

        rerender(<ShadowContent html="<p>second</p>" styles={STYLES} className="markdown-body" />);

        // The stylesheet the bootstrap injected must still be there — this is the regression.
        expect(shadow.querySelector(`link[href="${LEAFLET_CSS}"]`)).toBe(link);
        // Same <style> element, not a re-created (re-parsed) one.
        expect(shadow.querySelector('style')).toBe(styleBefore);
        // Content itself did swap.
        expect(shadow.querySelector('.markdown-body')?.innerHTML).toBe('<p>second</p>');
    });

    it('keeps the <style> ahead of the wrapper and the wrapper ahead of injected nodes', () => {
        const { container, rerender } = render(
            <ShadowContent html="<p>first</p>" styles={STYLES} className="markdown-body" />,
        );

        const shadow = shadowOf(container);
        injectLeafletCss(shadow);

        rerender(<ShadowContent html="<p>second</p>" styles={STYLES} className="markdown-body" />);

        const tags = Array.from(shadow.children).map((el) => el.tagName.toLowerCase());
        expect(tags).toEqual(['style', 'div', 'link']);
    });

    it('reports the shadow root only after the new wrapper is attached', () => {
        const seen: string[] = [];
        const onContentUpdated = (shadow: ShadowRoot) => {
            seen.push(shadow.querySelector('.markdown-body')?.innerHTML ?? '');
        };

        const { rerender } = render(
            <ShadowContent
                html="<p>first</p>"
                styles={STYLES}
                className="markdown-body"
                onContentUpdated={onContentUpdated}
            />,
        );
        rerender(
            <ShadowContent
                html="<p>second</p>"
                styles={STYLES}
                className="markdown-body"
                onContentUpdated={onContentUpdated}
            />,
        );

        expect(seen).toEqual(['<p>first</p>', '<p>second</p>']);
    });
});
