import './FullQueryHelper.scss';
import Modal from '@/components/modal/Modal';
import { useState } from 'react';
import { RxQuestionMark } from 'react-icons/rx';
import { IconButton } from '@/components/buttons/IconButton';
import { Close } from '@/assets/icons/Icon';
import { FULL_TYPING_QUERY_PLACEHOLDER, FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR } from '@/utils/constants';
import { CopyBlock } from '@/components/copyBlock';

export const FullQueryHelper = ({ pIsShow }: { pIsShow: boolean }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

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
                                <CopyBlock content={FULL_TYPING_QUERY_PLACEHOLDER} />
                                <span className="full-query-modal-body-desc-ex">same as</span>
                                <CopyBlock content={FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR} />
                            </div>
                        </Modal.Body>
                    </Modal>
                </div>
            ) : null}
        </div>
    ) : null;
};
