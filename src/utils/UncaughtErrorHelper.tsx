export const UncaughtErrorObserver = (setConsoleList: any) => {
    const sWarnTmp = window.console.warn;
    const sErrorTmp = window.console.error;
    // const sLogTmp = window.console.log;
    window.onerror = function (message) {
        if (typeof message === 'string' && message.includes("Uncaught TypeError: Cannot read properties of null (reading 'getAttribute')")) return true;
        if (typeof message === 'string' && message.includes("Uncaught TypeError: Cannot read properties of undefined (reading 'findNearestPointBy')")) return true;
        if (typeof message === 'string' && message.includes('Maximum update depth exceeded. This can happen when a component calls setState inside useEffect')) return true;
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
        if (typeof message === 'string' && message.includes('will be removed')) return true;
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
