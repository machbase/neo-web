import { createContext, useContext, ReactNode, useRef, useCallback, useState, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { gWsLog } from '@/recoil/websocket';
import { getId } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { useWsRouter } from '@/hooks/websocket/useWsRouter';
import { useExperiment } from '@/hooks/useExperiment';
import { showSessionExpiredToast } from '@/api/core';

interface WebSocketContextType {
    socket: React.MutableRefObject<WebSocket | null>;
    msgBatch: any[];
    sendMSG: (message: any) => void;
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
    children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
    const socketRef = useRef<WebSocket | null>(null);
    const messageHandlerRef = useRef<((data: any) => void) | null>(null);
    const isConnectingRef = useRef<boolean>(false);
    const intentionalCloseRef = useRef<boolean>(false);
    const [sMsgBatch, setMsgBatch] = useState<any[]>([]);
    const msgBufferRef = useRef<any[]>([]);
    const batchTimerRef = useRef<number | null>(null);
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const navigate = useNavigate();
    const { getExperiment } = useExperiment();
    const { handleWsMsg } = useWsRouter();

    const sendMSG = useCallback((message: any) => {
        if (!getExperiment()) return;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }, []);

    // Batch processing: Process buffered messages every 100ms
    const flushMessageBuffer = useCallback(() => {
        if (msgBufferRef.current.length > 0) {
            setMsgBatch([...msgBufferRef.current]);
            msgBufferRef.current = [];
            setTimeout(() => setMsgBatch([]), 200);
        }
    }, []);

    const connectWebSocket = useCallback(() => {
        if (socketRef.current || isConnectingRef.current) return;
        isConnectingRef.current = true;
        messageHandlerRef.current = handleWsMsg;

        const sId = getId();
        const protocol = window.location.protocol.indexOf('https') === -1 ? 'ws' : 'wss';
        const wsUrl = `${protocol}://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`;

        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onmessage = (event: MessageEvent) => {
            if (messageHandlerRef.current) {
                const sMsg: any = messageHandlerRef.current(event.data);
                if (sMsg) {
                    // Add message to batch buffer
                    msgBufferRef.current.push(sMsg);
                    // Use requestAnimationFrame for next frame update (~16ms)
                    if (!batchTimerRef.current) {
                        batchTimerRef.current = requestAnimationFrame(() => {
                            flushMessageBuffer();
                            batchTimerRef.current = null;
                        });
                    }
                }
            }
        };

        socketRef.current.onopen = () => {
            localStorage.setItem('consoleId', sId);
            isConnectingRef.current = false;
            setConsoleList((prevData: any) => [...prevData, { timestamp: new Date().getTime(), level: '', task: '', message: 'Connection established' }]);
        };

        socketRef.current.onclose = () => {
            socketRef.current = null;
            isConnectingRef.current = false;
            if (intentionalCloseRef.current) {
                intentionalCloseRef.current = false;
                return;
            }
            setConsoleList((prevData: any) => [...prevData, { timestamp: new Date().getTime(), level: '', task: '', message: 'Connection lost' }]);
            showSessionExpiredToast('Unable to connect to server.');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            navigate('/login');
        };

        socketRef.current.onerror = () => {
            isConnectingRef.current = false;
        };
    }, [setConsoleList, navigate]);

    const disconnectWebSocket = useCallback(() => {
        intentionalCloseRef.current = true;
        isConnectingRef.current = false;
        if (batchTimerRef.current) {
            cancelAnimationFrame(batchTimerRef.current);
            batchTimerRef.current = null;
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    // Clean up timer on component unmount
    useEffect(() => {
        return () => {
            if (batchTimerRef.current) {
                cancelAnimationFrame(batchTimerRef.current);
            }
        };
    }, []);

    const value: WebSocketContextType = {
        socket: socketRef,
        msgBatch: sMsgBatch,
        sendMSG,
        connectWebSocket,
        disconnectWebSocket,
    };

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};
