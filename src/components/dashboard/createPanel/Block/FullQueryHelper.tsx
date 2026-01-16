import { useState } from 'react';
import { RxQuestionMark } from 'react-icons/rx';
import { FULL_TYPING_QUERY_PLACEHOLDER, FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR } from '@/utils/constants';
import { Button, Modal, Page } from '@/design-system/components';

export const FullQueryHelper = ({ pIsShow }: { pIsShow: boolean }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const handleClick = () => {
        setIsOpen(!sIsOpen);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return pIsShow ? (
        <>
            <Button
                size="side"
                variant="ghost"
                icon={<RxQuestionMark />}
                onClick={handleClick}
                data-tooltip-id="block-full-query-question-mark"
                data-tooltip-content="The columns in the query should be formatted and ordered as 'TIME'(milli sec) and 'VALUE'(numeric)."
            />
            <Modal.Root isOpen={sIsOpen} onClose={handleClose} style={{ maxWidth: '50vw' }}>
                <Modal.Header>
                    <Modal.Title>Full query</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Page.ContentBlock pHoverNone style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span>
                            The columns in the query should be formatted and ordered as <code>'TIME'(milli sec)</code> and <code>'VALUE'(numeric)</code>.
                        </span>
                        <span>
                            You can use the predefined <code>'VARIABLES'</code> provided by Machbase Neo Dashboard.
                        </span>
                        <Page.CopyBlock pTitle="example)" pContent={FULL_TYPING_QUERY_PLACEHOLDER} />
                        <Page.CopyBlock pTitle="same as" pContent={FULL_TYPING_QUERY_PLACEHOLDER_WITHOUT_VAR} />
                    </Page.ContentBlock>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </>
    ) : (
        <></>
    );
};
