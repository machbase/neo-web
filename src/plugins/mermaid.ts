import mermaid from 'mermaid';

const setMermaid = () => {
    mermaid.initialize({ startOnLoad: false });
    mermaid.run();
};
export default setMermaid;
