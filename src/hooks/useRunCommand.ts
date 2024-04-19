import { useEffect } from 'react';

const sIsWin = window.navigator.platform.includes('Win');

const useRunCommand = (Callback: () => void) => {
    const handleDownKeyWin = (e: KeyboardEvent): void => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            Callback();
        }
    };

    const handleDownKeyMac = (e: KeyboardEvent): void => {
        if (e.metaKey && e.key === 'Enter') {
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

export default useRunCommand;
