import { ReactNode } from 'react';

export const Sidebar = ({ children }: { children: ReactNode }) => {
    return (
        <div
            style={{
                backgroundColor: '#333333',
                height: `calc(100% - 22px)`,
                overflow: 'auto',
            }}
        >
            {children}
        </div>
    );
};

export default Sidebar;
