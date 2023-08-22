import './index.scss';
import { useState } from 'react';

const log = () => {
    const sLogTab = ['Log', 'Terminal'];

    const [selectedTab, setSelectedTab] = useState('Log');

    const sLog = [
        '2023/07/31 13:49:17.242 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:49:46.034 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:49:55.445 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:50:01.420 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:50:12.620 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:50:25.856 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:50:40.470 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:52:51.766 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:56:32.551 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 13:56:32.552 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:03:13.990 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:03:30.674 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:04:15.349 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:06:26.601 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:11:35.550 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:16:35.783 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:17:41.068 WARN  sshd             session pull EOF',
        '2023/07/31 14:17:41.068 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:18:25.555 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:18:32.882 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 14:18:41.802 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:21:10.191 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:22:52.045 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:23:08.569 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:23:16.138 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:33:17.245 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:44:06.539 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:44:43.843 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:45:32.494 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:50:26.356 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:50:43.664 WARN  sshd             session pull read |1: file already closed',
        '2023/07/31 15:51:48.498 WARN  sshd             session pull read |1: file already closed',
    ];

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
            <div className="log-body">
                {sLog.map((aItem, aIdx) => {
                    return (
                        <div style={{ fontSize: '14px', fontFamily: 'Consolas' }} key={aIdx}>
                            {aItem}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default log;
