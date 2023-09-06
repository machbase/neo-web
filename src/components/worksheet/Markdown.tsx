import { useState, useEffect } from 'react';
import { postMd } from '@/api/repository/api';
import '@/assets/md/md.css';
import '@/components/worksheet/Markdown.scss';
import '@/assets/md/mdDark.css';
import setMermaid from '@/plugin/mermaid';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';

interface MarkdownProps {
    pContents?: any;
    pType?: string;
    pIdx: number;
}

export const Markdown = (props: MarkdownProps) => {
    const { pContents, pIdx, pType } = props;
    const [sMdxText, setMdxText] = useState<string>('');
    const [sBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);

    useEffect(() => {
        init();
    }, [pContents]);

    const init = async () => {
        if (pContents) {
            if (pType === 'mrk') {
                const sList = window.location.href;
                const sSelectedBoard = sBoardList.find((aItem) => aItem.id === sSelectedTab);

                let sReperer: any;
                if (sSelectedBoard && sSelectedBoard.path !== '') {
                    sReperer = sList.replace('/ui', '/api/tql') + sSelectedBoard.path + sSelectedBoard.name;
                }

                const sData = await postMd(pContents, true, sReperer);
                setMdxText(`<article>${sData}</article>`);
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
