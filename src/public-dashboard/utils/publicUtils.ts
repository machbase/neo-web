export { 
    setUnitTime, 
    calcRefreshTime, 
    calcInterval, 
    PanelIdParser 
} from './dashboardUtil';

export { 
    getId, 
    isMobile, 
    isEmpty, 
    isValidJSON,
    generateRandomString
} from '../utils';

export { refreshTimeList } from './dashboardUtil';

export const generatePublicId = () => {
    return `public_${Math.random().toString(36).substring(2, 15)}`;
};

export const isPublicMode = () => {
    return window.location.pathname.includes('/public');
};