export const UncaughtErrorObserver = (setConsoleList: any) => {
    window.onerror = function (message) {
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
