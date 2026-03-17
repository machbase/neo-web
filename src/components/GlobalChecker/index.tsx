import { useSchedule } from '@/hooks/useSchedule';
import { getLogin } from '@/api/repository/login';
import { gLicense } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { useExperiment } from '@/hooks/useExperiment';
import { isTokenExpiringSoon } from '@/utils/jwt';
import { executeReLogin } from '@/api/core';

// Proactive refresh threshold: refresh token 60 seconds before expiry
const PROACTIVE_REFRESH_THRESHOLD = 60;

export const GlobalChecker = () => {
    const setGLicense = useSetRecoilState(gLicense);
    const { setExperiment } = useExperiment();

    const getCheck = async () => {
        // 1. Proactive token refresh: renew accessToken before it expires
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            const expiring = isTokenExpiringSoon(accessToken, PROACTIVE_REFRESH_THRESHOLD);
            if (expiring === true) {
                try {
                    const refreshResult = await executeReLogin();
                    if (!refreshResult?.success) {
                        console.warn('Proactive token refresh failed');
                    }
                } catch (err) {
                    console.warn('Proactive token refresh error:', err);
                }
            }
        }

        // 2. Server & license status check
        const res: any = await getLogin();
        if (res) {
            setGLicense((prev: any) => {
                return { ...prev, licenseStatus: res?.licenseStatus?.toUpperCase(), eulaRequired: res?.eulaRequired };
            });
            setExperiment(res?.experimentMode ?? false);
        }
    };

    useSchedule(getCheck, 1000 * 30); // 30s

    return <></>;
};
