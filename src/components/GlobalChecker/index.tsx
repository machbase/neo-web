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
                    }
                } catch (err) {
                }
            }
        }

        // 2. Server & license status check
        const res: any = await getLogin();
        if (res) {
            const nextLicenseStatus = res?.licenseStatus?.toUpperCase();
            const nextEulaRequired = res?.eulaRequired;
            setGLicense((prev: any) => {
                // Bail out when nothing changed. Returning the same reference makes Recoil
                // skip the update, so this 30s poll no longer re-renders the whole app tree
                // (and, in turn, no longer redraws TQL/worksheet/dashboard charts).
                if (prev?.licenseStatus === nextLicenseStatus && prev?.eulaRequired === nextEulaRequired) {
                    return prev;
                }
                return { ...prev, licenseStatus: nextLicenseStatus, eulaRequired: nextEulaRequired };
            });
            setExperiment(res?.experimentMode ?? false);
        }
    };

    useSchedule(getCheck, 1000 * 30); // 30s

    return <></>;
};
