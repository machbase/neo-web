import { useState, useEffect, useRef } from 'react';
import { rpcMarkdownRender } from '@/api/repository/markdown';
import setMermaid from '@/plugin/mermaid';
import setChartext, { disposeChartext, resizeChartext } from '@/plugin/chartext';
import setGeomap, { disposeGeomap, resizeGeomap } from '@/plugin/geomap';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { generateUUID, parseCodeBlocks } from '@/utils';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Page, Toast } from '@/design-system/components';
import { ShadowContent } from './ShadowContent';
import mdCss from '@/assets/md/md.css?inline';
// import mdDarkCss from '@/assets/md/mdDark.css?inline';
// import markdownScss from '@/components/worksheet/Markdown.scss?inline';

// The copy-button styling lives in Markdown.scss (light DOM). Since the markdown now renders
// inside a Shadow DOM, that stylesheet does NOT cascade in, so the .cp-button div was rendered
// with no size and its width:100% SVG grew to fill the code block. Inject the button rules into
// the shadow so it stays a fixed 30x30 icon anchored to the top-right of each <pre>.
const CP_BUTTON_CSS = `
pre { position: relative; }
.cp-button {
    width: 30px;
    height: 30px;
    padding: 5px;
    box-sizing: border-box;
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background-color: transparent;
    border-radius: 8px;
    cursor: pointer;
}
.cp-button:hover { background-color: #52535a; }
.cp-button svg:hover { fill: #f8f8f8; }
`;

interface MarkdownProps {
    pContents?: any;
    pType?: string;
    pIdx: number;
    pData?: string;
    /**
     * Extra CSS appended AFTER `md.css` inside the shadow root.
     *
     * THE ONLY WAY TO RESTYLE THIS CONTENT FROM OUTSIDE. `md.css` is injected into
     * the shadow root and lands on a wrapper that lives inside it, so no selector
     * in the page — not even one on the host — can reach past it. A caller that
     * renders markdown somewhere md.css was not written for (a 320px side drawer,
     * say, where its 16px page typography leaves four words per line) has nothing
     * to override with unless it can add to that stylesheet.
     *
     * Optional and empty by default, so every existing call site renders exactly
     * as before.
     */
    pExtraCss?: string;
}

export const Markdown = (props: MarkdownProps) => {
    const { pContents, pType, pData, pExtraCss } = props;
    const [sMdxText, setMdxText] = useState<string>('');
    const [sBoardList] = useRecoilState(gBoardList);
    const [sMarkdownId, setMarkdownId] = useState<string>('');
    const [sCodeBlocks, setCodeBlocks] = useState<string[]>([]);
    const sCheckMermaid: RegExp = new RegExp('([```mermaid]*```mermaid[^```]*```)', 'igm');
    const sBodyRef: any = useRef(null);
    const sShadowRootRef = useRef<ShadowRoot | null>(null);
    const sSelectedTab = useRecoilValue<any>(gSelectedTab);

    useEffect(() => {
        init();
        setMarkdownId(generateUUID());
        if (typeof pContents === 'string') setCodeBlocks(parseCodeBlocks(pContents));
    }, [pContents]);
    useEffect(() => {
        if (typeof pContents !== 'string') return;
        drawMermaid();
        drawChartext();
        drawGeomap();
        if (!sMarkdownId) return;
        // Query INSIDE the shadow root — the rendered markdown lives in the shadow DOM, so a
        // document-level query never matches it and the copy buttons would never attach.
        const blocks = sShadowRootRef.current?.querySelectorAll('pre:not(.mermaid)');
        if (!blocks || blocks.length === 0) return;
        const clickHandlers: any = [];
        blocks.forEach((block: any, aIndex: number) => {
            const button = document.createElement('div');
            button.className = 'cp-button';
            button.innerHTML = `<svg
                                    viewBox="0 0 24 24"
                                    fill="rgba(255, 255, 255, 0.5)"
                                    height="100%"
                                    width="100%"
                                >
                                    <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z" />
                                </svg>`;
            block.appendChild(button);

            const clickHandler = () => handleCopy(sCodeBlocks[aIndex]);
            clickHandlers.push(clickHandler);
            button.addEventListener('click', clickHandler);
        });
        return () => {
            blocks.forEach((block, aIndex: number) => {
                const button = block.querySelector('.cp-button');
                if (button) {
                    button.removeEventListener('click', clickHandlers[aIndex]);
                }
            });
        };
    }, [sMdxText]);
    useEffect(() => {
        if (sSelectedTab === pData && sShadowRootRef.current) {
            // Render any mermaid nodes that were skipped while the tab was hidden (offsetWidth=0)
            // and resize echarts charts that may have booted at 0 width. setMermaid skips
            // already-processed nodes, so this only renders the still-pending ones.
            drawMermaid();
            resizeChartext(sShadowRootRef.current);
        }
        if (sSelectedTab === pData && sShadowRootRef.current) {
            resizeChartext(sShadowRootRef.current);
            resizeGeomap(sShadowRootRef.current);
        }
    }, [sSelectedTab]);

    useEffect(() => {
        return () => {
            if (sShadowRootRef.current) {
                disposeChartext(sShadowRootRef.current);
                disposeGeomap(sShadowRootRef.current);
            }
        };
    }, []);

    const drawMermaid = () => {
        if (
            sMdxText &&
            pContents &&
            pContents.match(sCheckMermaid) &&
            sBodyRef &&
            sBodyRef?.current &&
            sBodyRef.current.offsetWidth > 0
        ) {
            setMermaid(sShadowRootRef.current);
        }
    };
    const drawChartext = () => {
        if (sMdxText && sShadowRootRef.current) {
            setChartext(sShadowRootRef.current);
        }
    };
    const drawGeomap = () => {
        if (sMdxText && sShadowRootRef.current) {
            setGeomap(sShadowRootRef.current);
        }
    };
    const handleShadowContentUpdated = (shadowRoot: ShadowRoot) => {
        if (sMdxText) {
            setChartext(shadowRoot);
            setGeomap(shadowRoot);
        }
        // mermaid is intentionally NOT booted here: it has no resize path and marks nodes
        // data-processed right after render, so rendering at offsetWidth=0 (hidden tab) would
        // freeze a 0-width diagram permanently. drawMermaid() (offsetWidth-guarded) owns the
        // mermaid boot — from the [sMdxText] effect when visible, and from the [sSelectedTab]
        // effect when a hidden tab becomes active.
    };
    const handleCopy = (aText: string) => {
        ClipboardCopy(aText);
        Toast.success('copied content');
    };

    const fetchMrk = async (aContents: string, aReperer: string) => {
        const sData = await rpcMarkdownRender(aContents, true, aReperer);
        setMdxText(`<article>${sData}</article>`);
    };

    const init = async () => {
        if (pContents) {
            const sList = window.location.href;
            let sReperer = sList.replace('/ui', '/api/tql');
            if (pType === 'mrk') {
                const targetBoard = sBoardList.find(
                    (aItem) =>
                        JSON.stringify(aItem.savedCode) === JSON.stringify(pContents) ||
                        JSON.stringify(aItem.code) === JSON.stringify(pContents),
                );
                if (targetBoard && targetBoard.path !== '') {
                    sReperer += targetBoard.path + targetBoard.name;
                }
                fetchMrk(pContents, sReperer);
            } else if (pType === 'wrk-mrk') {
                const targetBoard = sBoardList.find(
                    (aBoard) => aBoard.type === 'wrk' && aBoard.id === pData,
                );
                if (targetBoard && targetBoard.path !== '') {
                    sReperer += targetBoard.path + targetBoard.name;
                }
                fetchMrk(pContents, sReperer);
            } else {
                setMdxText(`<article>${pContents}</article>`);
            }
        } else setMdxText('');
    };

    return (
        <Page.ContentBlock style={{ padding: 0, margin: 0, whiteSpace: 'normal' }} pHoverNone>
            <ShadowContent
                html={sMdxText}
                styles={`${mdCss}${CP_BUTTON_CSS}${pExtraCss ?? ''}`}
                className={`mrk-form markdown-body markdown-body-dark mrk${sMarkdownId}`}
                onShadowRootCreated={(shadowRoot) => {
                    sBodyRef.current = shadowRoot.host;
                    sShadowRootRef.current = shadowRoot;
                }}
                onContentUpdated={handleShadowContentUpdated}
            />
        </Page.ContentBlock>
    );
};
