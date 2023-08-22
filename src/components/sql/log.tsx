import './log.scss';
import { Delete } from '@/assets/icons/Icon';

export const LOG = ({ pDisplay, pLogList, onClearLog }: { pDisplay: string; pLogList: string[]; onClearLog: () => void }) => {
    const setColor = (aText: string) => {
        if (aText.includes('false')) return '#e41212';
        return 'rgb(245, 245, 245)';
    };

    return (
        <div style={{ height: 'calc(100% - 40px)', display: pDisplay }}>
            <div className="log-control-header" style={{ height: '41px', display: 'flex', alignItems: 'center' }}>
                <Delete onClick={onClearLog} style={{ marginLeft: '10px', cursor: 'pointer' }} />
            </div>
            <div className="log-contents-wrap" style={{ height: 'calc(100% - 41px)', padding: '10px', overflow: 'auto' }}>
                {pLogList.map((aLog: string, aIdx: number) => {
                    return (
                        <div key={aLog + aIdx} style={{ whiteSpace: 'pre-wrap', color: setColor(aLog) }}>
                            {aLog}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
