import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useModal, type UseModalProps } from '../../hooks/useModal';
import { Button } from '../Button';
import styles from './index.module.scss';

// Context
interface ModalContextValue extends ReturnType<typeof useModal> {}

const ModalContext = createContext<ModalContextValue | null>(null);

const useModalContext = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('Modal compound components must be used within Modal.Root');
    }
    return context;
};

// Root Component
interface ModalRootProps extends UseModalProps {
    children: React.ReactNode;
    className?: string;
}

const ModalRoot = ({ children, className, ...modalProps }: ModalRootProps) => {
    const modal = useModal(modalProps);

    if (!modal.isOpen) return null;

    return createPortal(
        <ModalContext.Provider value={modal}>
            <div {...modal.getOverlayProps()} className={styles['modal__overlay']}>
                <div {...modal.getContentProps()} className={`${styles.modal} ${className ?? ''}`}>
                    {children}
                </div>
            </div>
        </ModalContext.Provider>,
        document.body
    );
};

// Header Component
interface ModalHeaderProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalHeader = ({ children, className, style }: ModalHeaderProps) => {
    return (
        <div className={`${styles['modal__header']} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Title Component
interface ModalTitleProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalTitle = ({ children, className, style }: ModalTitleProps) => {
    return (
        <div className={`${styles['modal__title']} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Title Component
interface ModalTitleSubProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalTitleSub = ({ children, className, style }: ModalTitleSubProps) => {
    return (
        <div className={`${styles['modal__title__sub']} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Body Component
interface ModalBodyProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalBody = ({ children, className, style }: ModalBodyProps) => {
    return (
        <div className={`${styles['modal__body']} scrollbar-dark ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Body Content Component
interface ModalBodyContentProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalBodyContent = ({ children, className, style }: ModalBodyContentProps) => {
    return (
        <div className={`${styles['modal__body__content']} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Footer Component
interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalFooter = ({ children, className, style }: ModalFooterProps) => {
    return (
        <div className={`${styles['modal__footer']} ${className ?? ''}`} style={style}>
            {children}
        </div>
    );
};

// Close Button Component
interface ModalCloseProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ModalClose = ({ children, className, style }: ModalCloseProps) => {
    const modal = useModalContext();

    return (
        <button {...modal.getCloseButtonProps()} className={`${styles['modal__close']} ${className ?? ''}`} style={style}>
            {children ?? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </button>
    );
};

// Confirm Button Component
interface ModalConfirmProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
}

const ModalConfirm = ({ children, className, style, onClick, disabled, loading }: ModalConfirmProps) => {
    return (
        <Button variant="primary" className={className} style={style} onClick={onClick} disabled={disabled} loading={loading}>
            {children ?? 'Confirm'}
        </Button>
    );
};

// Cancel Button Component
interface ModalCancelProps {
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

const ModalCancel = ({ children, className, style, onClick }: ModalCancelProps) => {
    const modal = useModalContext();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            modal.close();
        }
    };

    return (
        <Button variant="secondary" className={className} style={style} onClick={handleClick}>
            {children ?? 'Cancel'}
        </Button>
    );
};

// Compound exports
export const Modal = {
    Root: ModalRoot,
    Header: ModalHeader,
    Title: ModalTitle,
    TitleSub: ModalTitleSub,
    Body: ModalBody,
    Content: ModalBodyContent,
    Footer: ModalFooter,
    Close: ModalClose,
    Confirm: ModalConfirm,
    Cancel: ModalCancel,
};

export type { ModalRootProps, ModalHeaderProps, ModalTitleProps, ModalBodyProps, ModalFooterProps, ModalCloseProps, ModalConfirmProps, ModalCancelProps };
