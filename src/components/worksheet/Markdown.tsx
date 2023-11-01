import { useState, useEffect } from 'react';
import { postMd } from '@/api/repository/api';
import '@/assets/md/md.css';
import '@/components/worksheet/Markdown.scss';
import '@/assets/md/mdDark.css';
import setMermaid from '@/plugin/mermaid';
import { useRecoilState } from 'recoil';
import { gBoardList } from '@/recoil/recoil';

interface MarkdownProps {
    pContents?: any;
    pType?: string;
    pIdx: number;
    pData?: string;
}

export const Markdown = (props: MarkdownProps) => {
    const { pContents, pIdx, pType } = props;
    const [sMdxText, setMdxText] = useState<string>('');
    const [sBoardList] = useRecoilState(gBoardList);

    useEffect(() => {
        init();
    }, [pContents]);

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
                const targetBoard = sBoardList.find((aBoard) => aBoard.type === 'wrk' && aBoard.id === props.pData);
                if (targetBoard && targetBoard.path !== '') {
                    sReperer += targetBoard.path + targetBoard.name;
                }
                fetchMrk(pContents, sReperer);
            } else {
                setMdxText(`<article>${pContents}</article>`);
            }
            setTimeout(() => {
                setMermaid();
            }, pIdx * 10);
        }
    };

    return <div className="mrk-form markdown-body" style={{ backgroundColor: '#1B1C21', width: '100%' }} dangerouslySetInnerHTML={{ __html: sMdxText }}></div>;
};
