import { ReactNode } from 'react';

export const Sidebar = ({ children, pBoardListLength }: { children: ReactNode; pBoardListLength: any }) => {
    return (
        <div style={{ backgroundColor: '#333333', height: `calc(100vh - ${pBoardListLength < 5 ? 88 + pBoardListLength * 22 : 88 + 5 * 22}px)`, overflow: 'auto' }}>{children}</div>
    );
};

export default Sidebar;
