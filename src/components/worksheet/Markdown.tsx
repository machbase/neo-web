import { useState, useEffect } from 'react';
import { postMd } from '@/api/repository/api';
import '@/assets/md/md.css';
import '@/components/worksheet/Markdown.scss';
import '@/assets/md/mdDark.css';
import setMermaid from '@/plugin/mermaid';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';
import { generateUUID, parseCodeBlocks } from '@/utils';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Success } from '@/components/toast/Toast';

interface MarkdownProps {
    pContents?: any;
    pType?: string;
    pIdx: number;
    pData?: string;
}

export const Markdown = (props: MarkdownProps) => {
    const { pContents, pIdx, pType, pData } = props;
    const [sMdxText, setMdxText] = useState<string>('');
    const [sBoardList] = useRecoilState(gBoardList);
    const [sMarkdownId, setMarkdownId] = useState<string>('');
    const [sCodeBlocks, setCodeBlocks] = useState<string[]>([]);
    const sCheckMermaid: RegExp = new RegExp('([```mermaid]*```mermaid[^```]*```)', 'igm');

    useEffect(() => {
        init();
        setMarkdownId(generateUUID());
        if (typeof pContents === 'string') setCodeBlocks(parseCodeBlocks(pContents));
    }, [pContents]);

    useEffect(() => {
        if (typeof pContents !== 'string') return;
        if (sMdxText && pContents && pContents.match(sCheckMermaid)) {
            setTimeout(() => {
                setMermaid();
            }, pIdx * 10);
        }
        if (!sMarkdownId) return;
        const blocks = document.querySelectorAll(`div.mrk${sMarkdownId} pre:not(.mermaid)`);
        if (!blocks) return;
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

    const handleCopy = (aText: string) => {
        ClipboardCopy(aText);
        Success('copied content');
    };

    const fetchMrk = async (aContents: string, aReperer: string) => {
        const sData = await postMd(aContents, true, aReperer);
        setMdxText(`<article>${sData}</article>`);
    };

    const init = async () => {
        if (pContents) {
            const sList = window.location.href;
            let sReperer = sList.replace('/ui', '/api/tql');
            if (pType === 'mrk') {
                const targetBoard = sBoardList.find(
                    (aItem) => JSON.stringify(aItem.savedCode) === JSON.stringify(pContents) || JSON.stringify(aItem.code) === JSON.stringify(pContents)
                );
                if (targetBoard && targetBoard.path !== '') {
                    sReperer += targetBoard.path + targetBoard.name;
                }
                fetchMrk(pContents, sReperer);
            } else if (pType === 'wrk-mrk') {
                const targetBoard = sBoardList.find((aBoard) => aBoard.type === 'wrk' && aBoard.id === pData);
                if (targetBoard && targetBoard.path !== '') {
                    sReperer += targetBoard.path + targetBoard.name;
                }
                fetchMrk(pContents, sReperer);
            } else {
                setMdxText(`<article>${pContents}</article>`);
            }
        }
    };

    return <div className={`mrk-form markdown-body mrk${sMarkdownId}`} style={{ backgroundColor: '#1B1C21', width: '100%' }} dangerouslySetInnerHTML={{ __html: sMdxText }}></div>;
};
