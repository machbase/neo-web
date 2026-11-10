import { VscRecord } from '@/assets/icons/Icon';
import { logLevelColor } from './logLevelColor';
import icons from '@/utils/icons';
import { useState } from 'react';
import './ConsoleTab.scss';

const ConsoleTab = ({ pSelectedTab, pNewLog, pDeleteConsoleTab, pHandleSelectedTab, pTab, pConsoleList }: any) => {
    const [sMouseHover, setMouseHover] = useState(false);
    const setColor = logLevelColor;
    return (
        <div
            className="console-tab-item"
            onMouseEnter={() => setMouseHover(true)}
            onMouseLeave={() => setMouseHover(false)}
            onClick={pHandleSelectedTab}
            data-testid={`tab-${encodeURIComponent(pTab.id)}`}
            data-selected={pSelectedTab === pTab.id}
        >
            <span className={`tabs ${pSelectedTab === pTab.id ? 'active-tab' : 'inactive-tab'}`}>{pTab.name}</span>
            <span>
                {pTab.type !== 'console' && sMouseHover && (
                    <span className="tab_close" onClick={(aEvent: any) => pDeleteConsoleTab(aEvent, pTab)} data-testid="close">
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
