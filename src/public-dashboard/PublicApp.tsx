import { RecoilRoot, useSetRecoilState } from 'recoil';
import { PublicRoutes } from './PublicRoutes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { fetchRollupVersion, getRollupTableList } from './api/repository/machiot';
import { gRollupTableList } from './recoil/recoil';
import { ErrorBoundary } from '@/design-system/components';

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
            {/* Stops a failure here at the public view instead of the app-wide screen, whose "Go to Login"
                means nothing to someone opening a shared link and signs out a viewer who is logged in.
                The card gets the viewport: the root here only takes its content's width. */}
            <ErrorBoundary name="region:public-board" variant="region" fallbackStyle={{ width: '100vw', height: '100vh' }}>
                <PublicRoutes />
            </ErrorBoundary>
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
