import './index.scss';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { useState } from 'react';

export const CopyBlock = ({ content }: { content: string }) => {
    const [sTooltipTxt, setTooltipTxt] = useState<string>('Copy');

    /** copy clipboard */
    const handleCopy = () => {
        setTooltipTxt('Copied!');
        ClipboardCopy(content);
    };
    const handleMouseout = () => {
        sTooltipTxt === 'Copied!' && setTooltipTxt('Copy');
    };

    return (
        <div className="copy-block">
            <div className="copy-block-text">
                <span>{content}</span>
            </div>
            <button className="copy-block-btn" onClick={handleCopy} onMouseOut={handleMouseout}>
                {sTooltipTxt}
            </button>
        </div>
    );
};
