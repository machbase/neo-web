// 기존 유틸리티들을 import해서 재export
export { 
    setUnitTime, 
    calcRefreshTime, 
    calcInterval, 
    PanelIdParser 
} from '@/utils/dashboardUtil';

export { 
    getId, 
    isMobile, 
    isEmpty, 
    isValidJSON,
    generateRandomString
} from '@/utils';

// refreshTimeList는 dashboardUtil에서 가져오기
export { refreshTimeList } from '@/utils/dashboardUtil';

// 공개 대시보드 전용 유틸리티들만 여기에 추가
export const generatePublicId = () => {
    return `public_${Math.random().toString(36).substring(2, 15)}`;
};

export const isPublicMode = () => {
    return window.location.pathname.includes('/public');
};