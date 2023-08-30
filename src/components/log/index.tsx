import './index.scss';
import { useState, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { gConsoleList } from '@/recoil/recoil';

const log = () => {
    const [sLogTab] = useState(['Log', 'Terminal']);
    const [selectedTab, setSelectedTab] = useState('Log');
    const [sConsoleList] = useRecoilState<any>(gConsoleList);
    const logRef = useRef<any>(null);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight + logRef.current.clientHeight;
    }, [sConsoleList]);

    const handleSelectedTab = (aValue: string) => {
        setSelectedTab(aValue);
    };
    return (
        <div className="log-form">
            <div className="log-form-tab">
                {sLogTab.map((aItem: string, aIdx: number) => {
                    return (
                        <div key={aIdx} onClick={() => handleSelectedTab(aItem)}>
                            <span style={selectedTab === aItem ? { borderBottom: '2px solid #005FB8' } : { opacity: 0.4 }}>{aItem}</span>
                        </div>
                    );
                })}
            </div>
            <div ref={logRef} className="log-body">
                {sConsoleList.length > 0 &&
                    sConsoleList.map((aItem: any, aIdx: number) => {
                        return (
                            <div style={{ fontSize: '14px', fontFamily: 'D2coding' }} key={aIdx}>
                                <span style={aItem.level === 'ERROR' ? { color: 'rgb(228, 18, 18)' } : { color: '#20C997' }}>{aItem.level} </span>
                                <span>{aItem.message}</span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default log;
