import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';

export const SideTitle = ({ pServer }: any) => {
    return (
        <div className="side-title">
            <span>machbase-neo {pServer && pServer.version}</span>
        </div>
    );
};

export const SideCollapse = ({ children, pCollapseState, pCallback }: { children: React.ReactNode; pCollapseState: boolean; pCallback: (e: React.MouseEvent) => void }) => {
    return (
        <div className="side-sub-title editors-title" onClick={pCallback}>
            <div className="collapse-icon">{pCollapseState ? <VscChevronDown /> : <VscChevronRight />}</div>
            <div className="files-open-option">{children}</div>
        </div>
    );
};

export const SideList = ({ children }: { children: React.ReactNode }) => {
    return <div>{children}</div>;
};
