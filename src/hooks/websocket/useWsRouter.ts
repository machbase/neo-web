import { useSetRecoilState } from 'recoil';
import { useCallback } from 'react';
import { E_WS_TYPE, gWsLog, WS_LOG_LIMIT } from '@/recoil/websocket';

export const useWsRouter = () => {
    const setLogList = useSetRecoilState(gWsLog);

    const handleWsMsg = useCallback(
        (msg: any) => {
            let sParsedMsg = JSON.parse(msg);
            const sType: string = sParsedMsg?.type ?? 'Unknown';

            switch (sType) {
                case E_WS_TYPE.PING:
                    break;

                case E_WS_TYPE.LOG:
                    setLogList((prev) => {
                        const newLog = sParsedMsg?.log;
                        if (!newLog) return prev;
                        if (prev.length >= WS_LOG_LIMIT) return [...prev.slice(1), newLog];
                        return [...prev, newLog];
                    });
                    break;

                case E_WS_TYPE.RPC_RSP:
                case E_WS_TYPE.MSG:
                    if (localStorage.getItem('experimentMode') === 'true') {
                        const sParsedSession = JSON.parse(sParsedMsg?.session);
                        sParsedMsg.session = sParsedSession;
                        return sParsedMsg;
                    }
                    break;

                default:
                    console.warn('Unknown WebSocket message type:', sType);
            }
        },
        [setLogList]
    );

    return { handleWsMsg };
};
