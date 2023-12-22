export const UncaughtErrorObserver = (setConsoleList: any) => {
    window.onerror = function (message, source, lineno, colno, error) {
        setConsoleList((preData: any) => [
            ...preData,
            {
                timestamp: new Date().getTime(),
                level: 'ERROR',
                task: '',
                message: message,
            },
        ]);
        return true;
    };
};
