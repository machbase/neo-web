import toast from 'react-hot-toast';
import { VscClose } from 'react-icons/vsc';
import './Toast.scss';

const toastStyle = {
    backgroundColor: '#404457',
    color: 'white',
    border: '0.5px solid rgba(255, 255, 255, 0.5)',
};

export const Error = (aMessage: string) => {
    return toast(
        (t) => (
            <div className="toast-custom-style-error">
                <div className="toast-custom-icon-error" onClick={() => toast.remove(t.id)}>
                    <VscClose />
                </div>
                <div className="toast-custom-text-error"> {aMessage} </div>
            </div>
        ),
        { className: 'toast-custom-outside' }
    );
};

export const Success = (aMessage: string) => {
    return toast.success(aMessage, {
        style: toastStyle,
    });
};
