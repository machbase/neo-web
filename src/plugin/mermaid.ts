import mermaid from 'mermaid';
import { getId } from '@/utils';

const setMermaid = async (shadowRoot?: ShadowRoot | null) => {
    if (shadowRoot) {
        const nodes = shadowRoot.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])');
        for (const node of nodes) {
            const definition = node.textContent?.trim();
            if (!definition) continue;
            try {
                const id = `mermaid-${getId()}`;
                const { svg } = await mermaid.render(id, definition);
                node.innerHTML = svg;
                node.setAttribute('data-processed', 'true');
            } catch (e) {
                console.error('Mermaid render error:', e);
            }
        }
    } else {
        mermaid.run();
    }
};
export default setMermaid;
