import { useRef } from 'react';
import "./Modal.scss";
interface ChildProps {
    children: React.ReactNode;
}
export interface ModalProps extends ChildProps{
    pIsDarkMode?: boolean;
    className?: string;
    onOutSideClose?: () => void;
}

export const Modal = (props: ModalProps) => {
    const { children, className, pIsDarkMode, onOutSideClose } = props;
    const ModalRef = useRef<HTMLDivElement>(null);

    const handleClose = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (onOutSideClose && ModalRef.current && !ModalRef.current.contains(aEvent.target as Node)) {
            onOutSideClose();
        }
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div ref={ModalRef} className={`modal ${className} ${pIsDarkMode ? 'modal-theme-dark' : 'modal-theme-white'}`}>
                {children}
            </div>
        </div>
    )
}

const Header = ({ children }: ChildProps) => {
    return (
        <div>{children}</div>
    )
}

const Body = ({ children }: ChildProps) => {
    return (
        <div>{children}</div>
    )
}
const Footer = ({ children }: ChildProps) => {
    return (
        <div>{children}</div>
    )
}

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;