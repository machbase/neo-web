import toast from 'react-hot-toast';
import { VscCheck, VscClose } from 'react-icons/vsc';
import './Toast.scss';

export const Error = (aMessage: string) => {
    return toast(
        (t) => (
            <div className="toast-custom-style">
                <div className="toast-custom-icon-error" onClick={() => toast.remove(t.id)}>
                    <VscClose />
                </div>
                <div className="toast-custom-text"> {aMessage} </div>
            </div>
        ),
        { className: 'toast-custom-outside', duration: 3000 }
    );
};

export const Success = (aMessage: string) => {
    return toast(
        (t) => (
            <div className="toast-custom-style">
                <div className="toast-custom-icon-success" onClick={() => toast.remove(t.id)}>
                    <VscCheck />
                </div>
                <div className="toast-custom-text"> {aMessage} </div>
            </div>
        ),
        { className: 'toast-custom-outside', duration: 3000 }
    );
};
