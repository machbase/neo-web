import { useSchedule } from '@/hooks/useSchedule';
import { getLogin } from '@/api/repository/login';
import { gLicense } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';

export const GlobalChecker = () => {
    const setGLicense = useSetRecoilState(gLicense);

    const getCheck = async () => {
        const res: any = await getLogin();
        if (res)
            setGLicense((prev: any) => {
                return { ...prev, licenseStatus: res?.licenseStatus?.toUpperCase(), eulaRequired: res?.eulaRequired };
            });
    };

    useSchedule(getCheck, 1000 * 30); // 30s

    return <></>;
};
