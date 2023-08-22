import { ReactNode } from 'react';

export const Sidebar = ({ children, pRecentFileLength }: { children: ReactNode; pRecentFileLength: any }) => {
    return <div style={{ backgroundColor: '#333333', height: `calc(100vh - ${79 + pRecentFileLength * 22}px)`, overflow: 'auto' }}>{children}</div>;
};

export default Sidebar;
