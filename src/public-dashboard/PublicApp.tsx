import { RecoilRoot, useSetRecoilState } from 'recoil';
import { PublicRoutes } from './PublicRoutes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { fetchRollupVersion, getRollupTableList } from './api/repository/machiot';
import { gRollupTableList } from './recoil/recoil';

const PublicAppContent = () => {
    const setRollupTabls = useSetRecoilState(gRollupTableList);

    const init = async () => {
        // RECENT = true, OLD = false
        const sResRollupVer: any = await fetchRollupVersion();
        if (sResRollupVer.svrState) localStorage.setItem('V$ROLLUP_VER', 'RECENT');
        else localStorage.setItem('V$ROLLUP_VER', 'OLD');

        // Get rollup table list and set it to recoil state
        const sRollupResult = await getRollupTableList();
        setRollupTabls(sRollupResult);
    };

    useEffect(() => {
        init();
        const originalTitle = document.title;
        document.title = `${originalTitle} - Public View`;
        return () => {
            document.title = originalTitle;
        };
    }, []);

    return (
        <div id="public-app-root">
            <PublicRoutes />
        </div>
    );
};

const PublicApp = () => {
    return (
        <RecoilRoot>
            <PublicAppContent />
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#2a2a2a',
                        color: '#fff',
                        border: '1px solid #333',
                    },
                }}
            />
        </RecoilRoot>
    );
};

export default PublicApp;
