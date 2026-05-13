import { createContext, useContext, ReactNode, useRef, useCallback, useState, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { E_WS_TYPE, gWsLog } from '@/recoil/websocket';
import { getId } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { useWsRouter } from '@/hooks/websocket/useWsRouter';
import { useExperiment } from '@/hooks/useExperiment';
import { showSessionExpiredToast } from '@/api/core';
import { JsonRpcRequest, JsonRpcResponse, setJsonRpcWebSocketCaller } from '@/api/repository/rpc';

interface PendingRpc {
    method: string;
    resolve: (response: JsonRpcResponse<unknown>) => void;
    reject: (error: Error) => void;
    timer: number;
    abortHandler?: () => void;
    signal?: AbortSignal;
}

interface WebSocketContextType {
    socket: React.MutableRefObject<WebSocket | null>;
    msgBatch: any[];
    sendMSG: (message: any) => void;
    callJsonRpc: (rpcRequest: JsonRpcRequest, signal?: AbortSignal) => Promise<JsonRpcResponse<unknown>>;
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
    const pendingRpcRef = useRef<Map<number, PendingRpc>>(new Map());
    const [sMsgBatch, setMsgBatch] = useState<any[]>([]);
    const msgBufferRef = useRef<any[]>([]);
    const batchTimerRef = useRef<number | null>(null);
    const setConsoleList = useSetRecoilState<any>(gWsLog);
    const navigate = useNavigate();
    const { getExperiment } = useExperiment();
    const { handleWsMsg } = useWsRouter();

    const createAbortError = useCallback(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return error;
    }, []);

    const cleanupPendingRpc = useCallback((id: number, pending: PendingRpc) => {
        window.clearTimeout(pending.timer);
        if (pending.abortHandler && pending.signal) {
            pending.signal.removeEventListener('abort', pending.abortHandler);
        }
        pendingRpcRef.current.delete(id);
    }, []);

    const rejectPendingRpc = useCallback(
        (message: string) => {
            pendingRpcRef.current.forEach((pending, id) => {
                cleanupPendingRpc(id, pending);
                pending.reject(new Error(message));
            });
        },
        [cleanupPendingRpc]
    );

    const resolvePendingRpc = useCallback(
        (message: any) => {
            if (message?.type !== E_WS_TYPE.RPC_RSP || !message?.rpc) return false;
            const rpcId = Number(message.rpc.id);
            if (!Number.isFinite(rpcId)) return false;
            const pending = pendingRpcRef.current.get(rpcId);
            if (!pending) return false;

            let sessionMethod = '';
            if (typeof message.session === 'string') {
                try {
                    sessionMethod = JSON.parse(message.session)?.method ?? '';
                } catch {
                    sessionMethod = '';
                }
            } else {
                sessionMethod = message.session?.method ?? '';
            }
            if (sessionMethod && sessionMethod !== pending.method) return false;

            cleanupPendingRpc(rpcId, pending);
            pending.resolve(message.rpc as JsonRpcResponse<unknown>);
            return true;
        },
        [cleanupPendingRpc]
    );

    const sendMSG = useCallback((message: any) => {
        if (!getExperiment()) return;
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }, []);

    const callJsonRpc = useCallback(
        (rpcRequest: JsonRpcRequest, signal?: AbortSignal) => {
            return new Promise<JsonRpcResponse<unknown>>((resolve, reject) => {
                const socket = socketRef.current;
                if (!socket || socket.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket is not connected'));
                    return;
                }
                if (signal?.aborted) {
                    reject(createAbortError());
                    return;
                }

                const timer = window.setTimeout(() => {
                    const pending = pendingRpcRef.current.get(rpcRequest.id);
                    if (!pending) return;
                    cleanupPendingRpc(rpcRequest.id, pending);
                    reject(new Error('WebSocket JSON-RPC request timed out'));
                }, 10000);
                const pending: PendingRpc = {
                    method: rpcRequest.method,
                    resolve,
                    reject,
                    timer,
                    signal,
                };
                if (signal) {
                    pending.abortHandler = () => {
                        cleanupPendingRpc(rpcRequest.id, pending);
                        reject(createAbortError());
                    };
                    signal.addEventListener('abort', pending.abortHandler, { once: true });
                }

                pendingRpcRef.current.set(rpcRequest.id, pending);
                try {
                    socket.send(
                        JSON.stringify({
                            type: E_WS_TYPE.RPC_REQ,
                            session: JSON.stringify({ method: rpcRequest.method, id: rpcRequest.id }),
                            rpc: rpcRequest,
                        })
                    );
                } catch (error) {
                    cleanupPendingRpc(rpcRequest.id, pending);
                    reject(error instanceof Error ? error : new Error(String(error)));
                }
            });
        },
        [cleanupPendingRpc, createAbortError]
    );

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
        intentionalCloseRef.current = false;
        messageHandlerRef.current = handleWsMsg;

        const sId = getId();
        const protocol = window.location.protocol.indexOf('https') === -1 ? 'ws' : 'wss';
        const wsUrl = `${protocol}://${window.location.host}/web/api/console/${sId}/data?token=${localStorage.getItem('accessToken')}`;

        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onmessage = (event: MessageEvent) => {
            try {
                const parsedMessage = JSON.parse(event.data);
                if (resolvePendingRpc(parsedMessage)) return;
            } catch {
                // Existing websocket router handles parse failures and unknown messages.
            }
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
            rejectPendingRpc('WebSocket connection closed');
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
        rejectPendingRpc('WebSocket connection closed');
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

    useEffect(() => {
        return setJsonRpcWebSocketCaller(callJsonRpc);
    }, [callJsonRpc]);

    const value: WebSocketContextType = {
        socket: socketRef,
        msgBatch: sMsgBatch,
        sendMSG,
        callJsonRpc,
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
