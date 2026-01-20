import toast from 'react-hot-toast';
import { VscCheck, VscClose } from 'react-icons/vsc';
import styles from './index.module.scss';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

/**
 * Toast Component
 *
 * A notification system using react-hot-toast with design system styling.
 * Provides success, error, info, and warning toast variants.
 */

const showToast = (message: string, variant: ToastVariant = 'info', options?: ToastOptions) => {
    const { duration = 3000, position = 'top-right' } = options || {};

    const icons = {
        success: <VscCheck size={16} />,
        error: <VscClose size={16} />,
        info: <VscCheck size={16} />,
        warning: <VscClose size={16} />,
    };

    const iconClasses = {
        success: styles['toast__icon--success'],
        error: styles['toast__icon--error'],
        info: styles['toast__icon--info'],
        warning: styles['toast__icon--warning'],
    };

    return toast(
        (t) => (
            <div className={styles['toast']}>
                <div className={`${styles['toast__icon']} ${iconClasses[variant]}`} onClick={() => toast.remove(t.id)}>
                    {icons[variant]}
                </div>
                <div className={styles['toast__message']}>{message}</div>
            </div>
        ),
        {
            className: styles['toast__container'],
            duration,
            position,
        }
    );
};

/**
 * Show a success toast notification
 */
export const success = (message: string, options?: ToastOptions) => {
    return showToast(message, 'success', options);
};

/**
 * Show an error toast notification
 */
export const error = (message: string, options?: ToastOptions) => {
    return showToast(message, 'error', options);
};

/**
 * Show an info toast notification
 */
export const info = (message: string, options?: ToastOptions) => {
    return showToast(message, 'info', options);
};

/**
 * Show a warning toast notification
 */
export const warning = (message: string, options?: ToastOptions) => {
    return showToast(message, 'warning', options);
};

export const Toast = {
    success,
    error,
    info,
    warning,
};
