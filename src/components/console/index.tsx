import './index.scss';
import { useState, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { gConsoleList } from '@/recoil/recoil';
import { VscChevronDown, VscChevronRight, VscChevronUp } from '@/assets/icons/Icon';

const Console = ({ pSetTerminalSizes, pTerminalSizes }: any) => {
    const [sConsoleTab] = useState(['Console']);
    const [selectedTab, setSelectedTab] = useState('Console');
    const [sConsoleList] = useRecoilState<any>(gConsoleList);
    const consoleRef = useRef<any>(null);

    useEffect(() => {
        if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight + consoleRef.current.clientHeight;
    }, [sConsoleList]);

    const handleSelectedTab = (aValue: string) => {
        setSelectedTab(aValue);
    };
    return (
        <div className="console-form">
            <div className="console-header">
                <div className="console-form-tab">
                    {sConsoleTab.map((aItem: string, aIdx: number) => {
                        return (
                            <div key={aIdx} onClick={() => handleSelectedTab(aItem)}>
                                <span style={selectedTab === aItem ? { borderBottom: '2px solid #005FB8' } : { opacity: 0.4 }}>{aItem}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="console-header-right">
                    {pTerminalSizes[1] === 40 && <VscChevronUp onClick={() => pSetTerminalSizes(['72%', '28%'])}></VscChevronUp>}
                    {pTerminalSizes[1] !== 40 && <VscChevronDown onClick={() => pSetTerminalSizes(['', 40])}></VscChevronDown>}
                </div>
            </div>
            <div ref={consoleRef} className="console-body">
                {sConsoleList.length > 0 &&
                    sConsoleList.map((aItem: any, aIdx: number) => {
                        return (
                            <div style={{ fontSize: '14px', fontFamily: 'D2coding', display: 'flex', alignItems: 'center' }} key={aIdx}>
                                <VscChevronRight></VscChevronRight>
                                <span style={aItem.level === 'ERROR' ? { color: 'rgb(228, 18, 18)', marginRight: '8px' } : { color: '#20C997', marginRight: '8px' }}>
                                    {aItem.level}
                                </span>
                                <span>{aItem.message}</span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default Console;
