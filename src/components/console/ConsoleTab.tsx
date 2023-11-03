import { VscRecord } from '@/assets/icons/Icon';
import icons from '@/utils/icons';
import { useState } from 'react';
import './ConsoleTab.scss';

const ConsoleTab = ({ pSelectedTab, pNewLog, pDeleteConsoleTab, pHandleSelectedTab, pTab, pConsoleList }: any) => {
    const [sMouseHover, setMouseHover] = useState(false);
    const setColor = (aItem: string) => {
        switch (aItem) {
            case 'TRACE':
                return '#C4C4C4';
            case 'DEBUG':
                return '#F8F8F8';
            case 'INFO':
                return '#339900';
            case 'ERROR':
                return '#CC3300';
            case 'WARN':
                return '#FFCC00';
        }
    };
    return (
        <div className="console-tab-item" onMouseEnter={() => setMouseHover(true)} onMouseLeave={() => setMouseHover(false)} onClick={pHandleSelectedTab}>
            <span className={`tabs ${pSelectedTab === pTab.id ? 'active-tab' : 'inactive-tab'}`}>{pTab.name}</span>
            <span>
                {pTab.type !== 'console' && sMouseHover && (
                    <span className="tab_close" onClick={(aEvent: any) => pDeleteConsoleTab(aEvent, pTab)}>
                        {icons('close')}
                    </span>
                )}
                {(!sMouseHover || pTab.type === 'console') && (
                    <span className="tab_close">{pNewLog && pTab.type === 'console' && <VscRecord color={setColor(pConsoleList[pConsoleList.length - 1]?.level)} />}</span>
                )}
            </span>
        </div>
    );
};
export default ConsoleTab;
