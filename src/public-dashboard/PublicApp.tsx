import { RecoilRoot } from 'recoil';
import { PublicRoutes } from './PublicRoutes';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

const PublicApp = () => {
    useEffect(() => {
        const originalTitle = document.title;
        document.title = `${originalTitle} - Public View`;
        
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