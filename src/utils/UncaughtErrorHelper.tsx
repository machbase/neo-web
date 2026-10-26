export const UncaughtErrorObserver = (setConsoleList: any) => {
    const sWarnTmp = window.console.warn;
    const sErrorTmp = window.console.error;
    // const sLogTmp = window.console.log;
    window.onerror = function (message) {
        if (typeof message === 'string' && message.includes("Uncaught TypeError: Cannot read properties of null (reading 'getAttribute')")) return true;
        if (typeof message === 'string' && message.includes("Uncaught TypeError: Cannot read properties of undefined (reading 'findNearestPointBy')")) return true;
        // A render loop reaches window.onerror as "… repeatedly calls setState inside componentWillUpdate or
        // componentDidUpdate …"; the "… calls setState inside useEffect" wording is React's console.error warning, which
        // never comes here — matching it hid nothing (F-24). The shared opening matches the error that does arrive.
        if (typeof message === 'string' && message.includes('Maximum update depth exceeded.')) return true;
        if (typeof message === 'string' && message.includes('ResizeObserver loop completed with undelivered notifications.')) return true;
        setConsoleList((preData: any) => [
            ...preData,
            {
                timestamp: new Date().getTime(),
                level: 'ERROR',
                task: '',
                message: message,
            },
        ]);
        // false keeps the browser's own report (the "Uncaught …" line with file, line and stack); true cancelled it
        // for every error, so only the hidden ones above should return true (F-24).
        return false;
    };
    window.console.warn = (message, loc) => {
        // ECharts 4.0+ deprecation notices (itemStyle.emphasis / label.normal / controlStyle …) come from
        // server-rendered TQL/markdown charts whose legacy option+theme syntax neo-web cannot change; they
        // are harmless back-compat noise. Drop them from BOTH the browser console and the in-app console
        // panel, mirroring the console.error filters below.
        if (typeof message === 'string' && message.startsWith('[ECharts] DEPRECATED')) return;
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
        if (typeof message === 'string' && message.includes('validateDOMNesting')) return true;
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
