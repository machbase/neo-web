import { RecoilRoot, useSetRecoilState } from 'recoil';
import { PublicRoutes } from './PublicRoutes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { fetchRollupVersion, getRollupTableList } from './api/repository/machiot';
import { gRollupTableList } from './recoil/recoil';
import { ErrorBoundary, ErrorCard } from '@/design-system/components';
import { useShareAvailability } from '@/hooks/useShareAvailability';

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
    // A shared board reads `/db/*` without a login, which a server with HTTP token auth on answers with 401
    // (#1576, until #1559). Asked before anything is read: then only this notice, and no board, rollup or
    // license request goes out. Nothing is drawn while asking.
    const sShareAvailable = useShareAvailability();
    if (sShareAvailable === undefined) return null;
    if (!sShareAvailable) {
        return <ErrorCard name="region:public-board-unavailable" variant="region" title="Shared links are not available on this server." message="" fallbackStyle={{ width: '100vw', height: '100vh' }} />;
    }
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
