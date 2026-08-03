import type { ReactNode } from 'react';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import styles from './PanelSeriesModal.module.scss';

export function SeriesModalFrame({
    title,
    footerMessage,
    onClose,
    onApply,
    children,
}: {
    title: string;
    footerMessage: string | undefined;
    onClose: () => void;
    onApply: () => void;
    children: ReactNode;
}) {
    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            style={{ maxWidth: '700px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <span className={styles.titleIcon} aria-hidden="true">
                        <BiSolidChart />
                    </span>
                    {title}
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div className={styles.panelStack}>{children}</div>
            </Modal.Body>
            <Modal.Footer>
                {footerMessage ? (
                    <span className={styles.footerMessage} role="status">
                        {footerMessage}
                    </span>
                ) : null}
                <Modal.Cancel>Cancel</Modal.Cancel>
                <Modal.Confirm onClick={onApply}>Apply</Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}
