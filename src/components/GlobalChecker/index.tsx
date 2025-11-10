import { useSchedule } from '@/hooks/useSchedule';
import { getLogin } from '@/api/repository/login';
import { gLicense } from '@/recoil/recoil';
import { useSetRecoilState } from 'recoil';
import { useExperiment } from '@/hooks/useExperiment';

export const GlobalChecker = () => {
    const setGLicense = useSetRecoilState(gLicense);
    const { setExperiment } = useExperiment();

    const getCheck = async () => {
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
