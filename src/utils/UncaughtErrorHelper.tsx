export const UncaughtErrorObserver = (setConsoleList: any) => {
    const sWarnTmp = window.console.warn;
    const sErrorTmp = window.console.error;
    // const sLogTmp = window.console.log;
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
    window.console.warn = (message, loc) => {
        sWarnTmp(message, loc);
        setConsoleList((preData: any) => [
            ...preData,
            {
                timestamp: new Date().getTime(),
                level: 'WARN',
                task: '',
                message: `${message} ${loc}`,
            },
        ]);
    };
    window.console.error = (message, loc) => {
        sErrorTmp(message, loc);
        setConsoleList((preData: any) => [
            ...preData,
            {
                timestamp: new Date().getTime(),
                level: 'ERROR',
                task: '',
                message: `${message} ${loc}`,
            },
        ]);
    };
    // window.console.log = (message, loc) => {
    //     sLogTmp(message, loc);
    //     setConsoleList((preData: any) => [
    //         ...preData,
    //         {
    //             timestamp: new Date().getTime(),
    //             level: 'INFO',
    //             task: '',
    //             message: `${message} ${loc}`,
    //         },
    //     ]);
    // };
};
