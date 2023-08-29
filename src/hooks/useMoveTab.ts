import { useEffect } from 'react';

const sIsWin = window.navigator.platform.includes('Win');

const useMoveTab = (Callback: (aValue: number) => void) => {
    const handleDownKeyWin = (e: KeyboardEvent): void => {
        if (e.altKey && 49 <= e.keyCode && e.keyCode <= 57) {
            e.preventDefault();
            Callback(Number(e.key));
        }
    };

    const handleDownKeyMac = (e: KeyboardEvent): void => {
        if (e.ctrlKey && 49 <= e.keyCode && e.keyCode <= 57) {
            e.preventDefault();
            Callback(Number(e.key));
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

export default useMoveTab;
