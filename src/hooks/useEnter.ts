const useEnter = (e: any, Callback: () => void) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        Callback();
    }
};

export default useEnter;
