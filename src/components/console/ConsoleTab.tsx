import icons from '@/utils/icons';

import { useState } from 'react';

const ConsoleTab = ({ pSelectedTab, pDeleteConsoleTab, pHandleSelectedTab, pTab }: any) => {
    const [sMouseHover, setMouseHover] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center' }} onMouseEnter={() => setMouseHover(true)} onMouseLeave={() => setMouseHover(false)} onClick={pHandleSelectedTab}>
            <span
                style={pSelectedTab === pTab.id ? { borderBottom: '2px solid #005FB8', display: 'flex' } : { borderBottom: '2px solid transparent', opacity: 0.4, display: 'flex' }}
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
                {(!sMouseHover || pTab.type === 'console') && <span className="tab_close"></span>}
            </span>
        </div>
    );
};
export default ConsoleTab;
