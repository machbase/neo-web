import type { ReactNode } from 'react';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Stack, Text } from './Presentation';
import styles from './SeriesDialog.module.scss';

export function SeriesDialog({
    title, onClose, onApply, message, applyDisabled, applyTestId, children,
    'data-testid': testId,
}: {
    title: string;
    onClose: () => void;
    onApply: () => void;
    message?: string;
    applyDisabled?: boolean;
    applyTestId?: string;
    children: ReactNode;
    'data-testid'?: string;
}) {
    return (
        <Modal.Root isOpen onClose={onClose} className={styles.modal} data-testid={testId}>
            <Modal.Header>
                <Modal.Title className={styles.title}>
                    <span className={styles.icon} aria-hidden="true"><BiSolidChart /></span>
                    {title}
                </Modal.Title>
                <Modal.Close data-testid="close" />
            </Modal.Header>
            <Modal.Body><Stack>{children}</Stack></Modal.Body>
            <Modal.Footer>
                {message && <Text variant="caption" tone="danger" className={styles.message} role="status">{message}</Text>}
                <Modal.Cancel data-testid="cancel">Cancel</Modal.Cancel>
                <Modal.Confirm onClick={onApply} disabled={applyDisabled} data-testid={applyTestId ?? 'apply'}>
                    Apply
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}
