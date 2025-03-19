import './FullQueryHelper.scss';
import Modal from '@/components/modal/Modal';
import { useState } from 'react';
import { RxQuestionMark } from 'react-icons/rx';
import { IconButton } from '@/components/buttons/IconButton';
import { Close } from '@/assets/icons/Icon';
import { FULL_TYPING_QUERY_PLACEHOLDER } from '@/utils/constants';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

export const FullQueryHelper = ({ pIsShow }: { pIsShow: boolean }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const [sTooltipTxt, setTooltipTxt] = useState<string>('Copy');

    /** copy clipboard */
    const handleCopy = () => {
        setTooltipTxt('Copied!');
        ClipboardCopy(FULL_TYPING_QUERY_PLACEHOLDER);
    };
    const handleMouseout = () => {
        sTooltipTxt === 'Copied!' && setTooltipTxt('Copy');
    };

    const handleClick = () => {
        setIsOpen(!sIsOpen);
    };

    return pIsShow ? (
        <div className="dsh-block-full-query-wrap">
            <IconButton
                pWidth={20}
                pHeight={20}
                pIsToopTip
                pToolTipId={'block-full-query-question-mark'}
                pToolTipContent={`The columns in the query should be formatted and ordered as 'TIME'(milli sec) and 'VALUE'(numeric).`}
                pIcon={<RxQuestionMark />}
                onClick={handleClick}
            />
            {sIsOpen ? (
                <div className="dsh-block-full-query-modal">
                    <Modal pIsDarkMode className="full-query-modal" onOutSideClose={() => setIsOpen(false)}>
                        <Modal.Header>
                            <div className="full-query-modal-header">
                                <div className="title">
                                    <div className="title-content">
                                        <span>Full query</span>
                                    </div>
                                </div>
                                <Close style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                            </div>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="full-query-modal-body">
                                <span className="full-query-modal-body-desc">
                                    The columns in the query should be formatted and ordered as <code>'TIME'(milli sec)</code> and <code>'VALUE'(numeric)</code>.
                                </span>
                                <span className="full-query-modal-body-desc">
                                    You can use the predefined <code>'VARIABLES'</code> provided by Machbase Neo Dashboard.
                                </span>
                                <span className="full-query-modal-body-desc-ex">example)</span>
                                <div className="full-query-modal-body-copy-block">
                                    <div className="full-query-modal-body-copy-block-text">
                                        <span>{FULL_TYPING_QUERY_PLACEHOLDER}</span>
                                    </div>
                                    <button className="full-query-modal-body-copy-block-btn" onClick={handleCopy} onMouseOut={handleMouseout}>
                                        {sTooltipTxt}
                                    </button>
                                </div>
                            </div>
                        </Modal.Body>
                    </Modal>
                </div>
            ) : null}
        </div>
    ) : null;
};
