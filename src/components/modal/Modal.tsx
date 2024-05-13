import { useRef, useState, useEffect } from 'react';
import './Modal.scss';
import useEsc from '@/hooks/useEsc';
interface ChildProps {
    children: React.ReactNode;
}
export interface ModalProps extends ChildProps {
    pIsDarkMode?: boolean;
    className?: string;
    onOutSideClose?: () => void;
}

export const Modal = (props: ModalProps) => {
    const { children, className, pIsDarkMode, onOutSideClose } = props;
    const [sIsStartInner, setIsStartInner] = useState<any>(null);
    const ModalRef = useRef<HTMLDivElement>(null);

    // Escape key press
    useEsc(() => onOutSideClose && onOutSideClose());

    useEffect(() => {
        document.addEventListener('mousedown', handleInner);
        return () => {
            document.removeEventListener('mousedown', handleInner);
        };
    }, []);

    const handleClose = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (onOutSideClose && ModalRef.current && !ModalRef.current.contains(aEvent.target as Node) && !sIsStartInner) {
            onOutSideClose();
        }
    };

    const handleInner = (event: MouseEvent) => {
        if (ModalRef.current) {
            setIsStartInner(ModalRef.current.contains(event.target as Node));
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div ref={ModalRef} className={`modal ${className} ${pIsDarkMode ? 'modal-theme-dark' : 'modal-theme-white'}`}>
                {children}
            </div>
        </div>
    );
};

const Header = ({ children }: ChildProps) => {
    return <div>{children}</div>;
};

const Body = ({ children }: ChildProps) => {
    return <div>{children}</div>;
};
const Footer = ({ children }: ChildProps) => {
    return <div>{children}</div>;
};

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
