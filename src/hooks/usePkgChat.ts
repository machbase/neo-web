import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { decodeJwtPayload } from '@/utils/jwt';

export interface PkgModel {
    name: string;
    model_id?: string;
}

export interface PkgProvider {
    provider: string;
    models: PkgModel[];
}

export interface PkgSelectedModel {
    provider: string;
    model: string;
    name: string;
}

interface Message {
    id: string;
    content: string;
    timestamp: number;
    role: 'user' | 'assistant';
    type: 'block' | 'msg' | 'answer' | 'question' | 'error';
    isProcess: boolean;
    isInterrupt: boolean;
}

const getUserId = (): string => {
    const token = localStorage.getItem('accessToken');
    const payload = token ? decodeJwtPayload(token) : null;
    return payload?.sub ?? '';
};

// ============================================================
// External WebSocket configuration (neo-pkg-llm)
// ============================================================
const EXT_HOST = '192.168.0.87';
const EXT_PORT = 8884;
const getExtWsUrl = () => `ws://${EXT_HOST}:${EXT_PORT}/${getUserId()}/ws`;

// Incoming message types from pkg
interface ExtMsgIncoming {
    type: string;
    session?: string;
    providers?: PkgProvider[];
    msg?: string;
    message?: {
        ver: string;
        id: number;
        type: string;
        body?: {
            ofStreamBlockDelta?: {
                contentType?: string;
                text?: string;
            };
        };
    };
}

// Outgoing message types to pkg
type ExtWsOutgoing =
    | { type: 'get_models'; user_id: string }
    | { type: 'chat'; user_id: string; session_id: string; provider: string; model: string; query: string }
    | { type: 'stop'; user_id: string; session_id: string };

const generateSessionId = (): string => {
    return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const DEFAULT_DELTA_SET = (target: 'msg' | 'block'): Message => {
    const sTimeStamp = Date.now();
    return {
        id: `${target}-${sTimeStamp}-${Math.random()}`,
        content: '',
        timestamp: sTimeStamp,
        role: 'assistant',
        type: target,
        isProcess: true,
        isInterrupt: false,
    };
};

export const usePkgChat = (_pWrkId: string, _pIdx: number, pInitialMessages?: Message[]) => {
    const socketRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string>(generateSessionId());
    const [wsReady, setWsReady] = useState(false);

    const [messages, setMessages] = useState<Message[]>(pInitialMessages ?? []);
    const [sInputValue, setInputValue] = useState('');
    const [sProcessingAnswer, setProcessingAnswer] = useState<boolean>(false);
    const [sSelectedModel, setSelectedModel] = useState<PkgSelectedModel>({ provider: '', model: '', name: '' });
    const [sProviderList, setProviderList] = useState<PkgProvider[]>([]);
    const [sModelsMessage, setModelsMessage] = useState<string>('');
    const callbackRef = useRef<any>(undefined);

    const isComposingRef = useRef<boolean>(false);
    const processingAnswerRef = useRef<boolean>(false);

    const getProcessingAnswer = useMemo(() => sProcessingAnswer, [sProcessingAnswer]);

    // WebSocket connect
    const connect = useCallback(() => {
        // Close existing connection
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        try {
            const ws = new WebSocket(getExtWsUrl());
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('[EXT_WS] Connected to', getExtWsUrl());
                setWsReady(true);
            };

            ws.onmessage = (event) => {
                try {
                    const raw: ExtMsgIncoming = JSON.parse(event.data);

                    switch (raw.type) {
                        case 'models':
                            handleModelsResponse(raw);
                            break;
                        case 'msg':
                            handleMsgResponse(raw);
                            break;
                        case 'stop':
                            handleStopResponse(raw);
                            break;
                        case 'error':
                            handleErrorResponse(raw);
                            break;
                    }
                } catch (e) {
                    console.error('[EXT_WS] Parse error:', e, event.data);
                }
            };

            ws.onclose = () => {
                console.log('[EXT_WS] Disconnected');
                socketRef.current = null;
                setWsReady(false);
                setProcessingAnswer(false);
            };

            ws.onerror = (err) => {
                console.error('[EXT_WS] Error:', err);
            };
        } catch (e) {
            console.error('[EXT_WS] Connect error:', e);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            socketRef.current?.close();
        };
    }, [connect]);

    // Handle stop response
    const handleStopResponse = useCallback((raw: ExtMsgIncoming) => {
        setProcessingAnswer(false);
        processingAnswerRef.current = false;
        if (raw.msg) {
            setMessages((prev) => [
                ...prev,
                { id: `msg-${Date.now()}-stop`, content: raw.msg!, timestamp: Date.now(), role: 'assistant', type: 'msg', isProcess: false, isInterrupt: false },
            ]);
        }
    }, []);

    // Handle error response
    const handleErrorResponse = useCallback((raw: ExtMsgIncoming) => {
        setProcessingAnswer(false);
        processingAnswerRef.current = false;
        if (raw.msg) {
            setMessages((prev) => [
                ...prev,
                { id: `msg-${Date.now()}-error`, content: raw.msg!, timestamp: Date.now(), role: 'assistant', type: 'error', isProcess: false, isInterrupt: false },
            ]);
        }
    }, []);

    // Handle models response
    const handleModelsResponse = useCallback((raw: ExtMsgIncoming) => {
        if (raw.providers) {
            setProviderList(raw.providers);
            setModelsMessage('');
        } else if (raw.msg) {
            setProviderList([]);
            setModelsMessage(raw.msg);
        }
    }, []);

    // Handle msg response (streaming)
    const handleMsgResponse = useCallback((raw: ExtMsgIncoming) => {
        const msg = raw.message;
        if (!msg) return;

        switch (msg.type) {
            case 'answer_start':
                setProcessingAnswer(true);
                processingAnswerRef.current = true;
                break;

            case 'answer_stop':
                if (callbackRef?.current) {
                    callbackRef.current();
                    callbackRef.current = undefined;
                }
                setProcessingAnswer(false);
                processingAnswerRef.current = false;
                break;

            case 'stream_msg_start':
                setMessages((prev) => [...prev, DEFAULT_DELTA_SET('msg')]);
                break;

            case 'stream_block_start':
                setMessages((prev) => [...prev, DEFAULT_DELTA_SET('block')]);
                break;

            case 'stream_block_delta': {
                const text = msg.body?.ofStreamBlockDelta?.text ?? '';
                setMessages((prev) => {
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    for (let i = updated.length - 1; i >= 0; i--) {
                        if (updated[i].type === 'block' && updated[i].isProcess) {
                            updated[i] = { ...updated[i], content: updated[i].content + text };
                            break;
                        }
                    }
                    return updated;
                });
                break;
            }

            case 'stream_msg_delta': {
                const text = msg.body?.ofStreamBlockDelta?.text ?? '';
                setMessages((prev) => {
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    for (let i = updated.length - 1; i >= 0; i--) {
                        if (updated[i].type === 'msg' && updated[i].isProcess) {
                            updated[i] = { ...updated[i], content: updated[i].content + text };
                            break;
                        }
                    }
                    return updated;
                });
                break;
            }

            case 'stream_block_stop':
            case 'stream_msg_stop': {
                const targetType = msg.type === 'stream_msg_stop' ? 'msg' : 'block';
                setMessages((prev) => {
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    for (let i = updated.length - 1; i >= 0; i--) {
                        if (updated[i].type === targetType && updated[i].isProcess) {
                            updated[i] = { ...updated[i], isProcess: false };
                            break;
                        }
                    }
                    return updated;
                });
                break;
            }
        }
    }, []);

    // Send to external WS
    const sendExt = useCallback((payload: ExtWsOutgoing) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        } else {
            console.warn('[EXT_WS] Not connected, cannot send');
        }
    }, []);

    // Request model list
    const getListModels = useCallback(() => {
        sendExt({ type: 'get_models', user_id: getUserId() });
    }, [sendExt]);

    // Send chat message
    const sendMessageWithText = (text: string, aCallback?: (aVal: boolean) => void) => {
        if (!text.trim()) return;
        if (!sSelectedModel.provider || !sSelectedModel.model) return;

        if (aCallback) callbackRef.current = aCallback;
        else callbackRef.current = undefined;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            content: text,
            timestamp: Date.now(),
            role: 'user',
            type: 'question',
            isProcess: false,
            isInterrupt: false,
        };
        setMessages((prev) => [...prev, userMessage]);

        sendExt({
            type: 'chat',
            user_id: getUserId(),
            session_id: sessionIdRef.current,
            provider: sSelectedModel.provider,
            model: sSelectedModel.model,
            query: text,
        });
    };

    const handleSendMessage = () => {
        sendMessageWithText(sInputValue);
        setInputValue('');
    };

    const handleInterruptMessage = () => {
        setMessages((prev) => prev.map((m) => ({ ...m, isInterrupt: true })));
        sendExt({ type: 'stop', user_id: getUserId(), session_id: sessionIdRef.current });
    };

    const isConnected = wsReady && socketRef.current?.readyState === WebSocket.OPEN;

    return {
        messages,
        setMessages,
        inputValue: sInputValue,
        setInputValue,
        isProcessingAnswer: getProcessingAnswer,
        processingAnswerRef,
        selectedModel: sSelectedModel,
        setSelectedModel,
        providerList: sProviderList,
        modelsMessage: sModelsMessage,
        isComposingRef,
        isConnected,
        reconnect: connect,
        handleSendMessage,
        handleInterruptMessage,
        getListModels,
        sendMessageWithText,
    };
};
