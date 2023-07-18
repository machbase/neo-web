import mermaid from 'mermaid';

const setMermaid = () => {
    mermaid.initialize({ startOnLoad: false });
    mermaid.run();
    return;
};
export default setMermaid;
