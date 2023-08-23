import toast from 'react-hot-toast';

const toastStyle = {
    backgroundColor: '#404457',
    color: 'white',
    border: '0.5px solid rgba(255, 255, 255, 0.5)',
};

export const Error = (aMessage: string) => {
    return toast.error(aMessage, {
        style: toastStyle,
    });
};

export const Success = (aMessage: string) => {
    return toast.success(aMessage, {
        style: toastStyle,
    });
};
