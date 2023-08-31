import { VscPass, VscWarning } from '@/assets/icons/Icon';
import icons from '@/utils/icons';

import { useState } from 'react';

const ConsoleTab = ({ pSelectedTab, pNewLog, pDeleteConsoleTab, pHandleSelectedTab, pTab, pConsoleList }: any) => {
    const [sMouseHover, setMouseHover] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center' }} onMouseEnter={() => setMouseHover(true)} onMouseLeave={() => setMouseHover(false)} onClick={pHandleSelectedTab}>
            <span
                style={
                    pSelectedTab === pTab.id ? { borderBottom: '2px inset  #005FB8', display: 'flex' } : { borderBottom: '2px inset  transparent', opacity: 0.4, display: 'flex' }
                }
                className="tabs"
            >
                {pTab.name}
            </span>
            <span>
                {pTab.type !== 'console' && sMouseHover && (
                    <span className="tab_close" onClick={(aEvent: any) => pDeleteConsoleTab(aEvent, pTab)}>
                        {icons('close')}
                    </span>
                )}
                {(!sMouseHover || pTab.type === 'console') && (
                    <span className="tab_close">
                        {pNewLog && pTab.type === 'console' && pConsoleList[pConsoleList.length - 1]?.level === 'ERROR' ? (
                            <VscWarning color="#C63100"></VscWarning>
                        ) : pNewLog && pTab.type === 'console' && pConsoleList[pConsoleList.length - 1]?.level === 'ERROR' ? (
                            <VscPass color="#319400"></VscPass>
                        ) : (
                            ''
                        )}
                    </span>
                )}
            </span>
        </div>
    );
};
export default ConsoleTab;
