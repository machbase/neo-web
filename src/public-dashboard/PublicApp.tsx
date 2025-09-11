import { RecoilRoot } from 'recoil';
import { PublicRoutes } from './PublicRoutes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

const PublicApp = () => {
    useEffect(() => {
        // 공개 모드임을 문서 타이틀에 표시
        const originalTitle = document.title;
        document.title = `${originalTitle} - Public View`;
        
        // 컴포넌트 언마운트 시 원래 타이틀 복원
        return () => {
            document.title = originalTitle;
        };
    }, []);

    return (
        <RecoilRoot>
            <div id="public-app-root">
                <PublicRoutes />
            </div>
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