import { getWebStatus, getDataStatus, getReportStatus, getCacheStatus } from '@/api/repository/userManagement';
const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

const utils = {
    delay,
};

const getStatusTimeCheck = async (aType: string) => {
    let webTimeS = 0;
    let webTimeE = 0;
    switch (aType) {
        case 'web':
            webTimeS = performance.now();
            await getWebStatus();
            webTimeE = performance.now();
            return (webTimeE - webTimeS).toFixed();
        case 'data':
            webTimeS = performance.now();
            await getDataStatus();
            webTimeE = performance.now();
            return (webTimeE - webTimeS).toFixed();
        case 'report':
            webTimeS = performance.now();
            await getReportStatus();
            webTimeE = performance.now();
            return (webTimeE - webTimeS).toFixed();
        case 'cache':
            webTimeS = performance.now();
            await getCacheStatus();
            webTimeE = performance.now();
            return (webTimeE - webTimeS).toFixed();
        default:
            return 0;
    }
};

export { utils, getStatusTimeCheck };
