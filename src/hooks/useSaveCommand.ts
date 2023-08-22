import { useEffect } from 'react';

const useSaveCommand = (Callback: () => void) => {
    const handleDownKey = (e: KeyboardEvent): void => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            Callback();
        }
    };

    useEffect(() => {
        document.addEventListener('keydown', handleDownKey);
        return () => {
            document.removeEventListener('keydown', handleDownKey);
        };
    }, [Callback]);
};

export default useSaveCommand;
