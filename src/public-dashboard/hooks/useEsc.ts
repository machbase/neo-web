import { useEffect } from 'react';

const sIsWin = window.navigator.platform.includes('Win');

const useEsc = (Callback: () => void) => {
    const handleDownKeyWin = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            e.preventDefault();
            Callback();
        }
    };

    const handleDownKeyMac = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            e.preventDefault();
            Callback();
        }
    };

    useEffect(() => {
        if (sIsWin) document.addEventListener('keydown', handleDownKeyWin);
        else document.addEventListener('keydown', handleDownKeyMac);

        return () => {
            if (sIsWin) document.removeEventListener('keydown', handleDownKeyWin);
            else document.removeEventListener('keydown', handleDownKeyMac);
        };
    }, [Callback]);
};

export default useEsc;