import mermaid from 'mermaid';
import { getId } from '@/utils';
import { currentScheme } from '@/design-system/theme';

/** The diagram source, kept on the node: rendering replaces its text with the SVG. */
const SOURCE_ATTR = 'data-mermaid-source';

/**
 * Mermaid's own palette for the scheme in force: `dark` as it always was, `default` (its light
 * palette) under a light theme. Mermaid draws SVG with colours of its own; CSS variables do not
 * reach them.
 */
export const initMermaid = () => {
    mermaid.initialize({ startOnLoad: true, theme: currentScheme() === 'light' ? 'default' : 'dark' });
};

const renderNode = async (node: HTMLElement) => {
    const definition = node.getAttribute(SOURCE_ATTR) ?? node.textContent?.trim();
    if (!definition) return;
    try {
        const id = `mermaid-${getId()}`;
        const { svg } = await mermaid.render(id, definition);
        node.setAttribute(SOURCE_ATTR, definition);
        node.innerHTML = svg;
        node.setAttribute('data-processed', 'true');
    } catch {
        // An invalid diagram stays as its source text, as before.
    }
};

const setMermaid = async (shadowRoot?: ShadowRoot | null) => {
    if (shadowRoot) {
        const nodes = shadowRoot.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])');
        for (const node of nodes) await renderNode(node);
    } else {
        mermaid.run();
    }
};

/** Draws the already drawn diagrams again (after a theme change: mermaid was re-initialised). */
export const redrawMermaid = async (shadowRoot?: ShadowRoot | null) => {
    if (!shadowRoot) return;
    const nodes = shadowRoot.querySelectorAll<HTMLElement>(`.mermaid[${SOURCE_ATTR}]`);
    for (const node of nodes) await renderNode(node);
};

export default setMermaid;
