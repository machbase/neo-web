const mockInitialize = jest.fn();
const mockRender = jest.fn(async (_id: string, aDefinition: string) => ({ svg: `<svg data-def="${aDefinition}"></svg>` }));
jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: (...a: unknown[]) => mockInitialize(...a), render: (...a: [string, string]) => mockRender(...a), run: jest.fn() } }));

import setMermaid, { initMermaid, redrawMermaid } from './mermaid';

afterEach(() => {
    document.documentElement.style.removeProperty('color-scheme');
    jest.clearAllMocks();
});

test('mermaid keeps its dark palette with no theme, and takes its light one under a light theme', () => {
    initMermaid();
    expect(mockInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
    document.documentElement.style.setProperty('color-scheme', 'light');
    initMermaid();
    expect(mockInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'default' }));
});

test('a drawn diagram keeps its source, so a theme change can draw it again', async () => {
    const sHost = document.createElement('div');
    const sRoot = sHost.attachShadow({ mode: 'open' });
    sRoot.innerHTML = '<div class="mermaid">graph TD; A--&gt;B</div>';
    await setMermaid(sRoot);
    const sNode = sRoot.querySelector('.mermaid') as HTMLElement;
    expect(sNode.querySelector('svg')).not.toBeNull();
    expect(sNode.getAttribute('data-mermaid-source')).toBe('graph TD; A-->B');
    await redrawMermaid(sRoot);
    expect(mockRender).toHaveBeenCalledTimes(2);
    expect(mockRender).toHaveBeenLastCalledWith(expect.any(String), 'graph TD; A-->B');
});
