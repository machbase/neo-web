import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_MSG_TYPE, E_RPC_METHOD, E_WS_KEY, E_WS_TYPE, RPC_LLM_LIST } from '@/recoil/websocket';
import { Model, WsMSG, WsRPC } from '@/utils/websocket';

export interface Message {
    id: string;
    content: string;
    timestamp: number;
    role: 'user' | 'assistant';
    type: 'block' | 'msg' | 'answer' | 'question';
    isProcess: boolean;
}

const DEFAULT_DETAL_SET = (target: 'msg' | 'block'): Message => {
    const sTimeStamp = Date.now();
    const sRandom = Math.random();
    return {
        id: `${target}-${sTimeStamp}-${sRandom}`,
        content: '',
        timestamp: sTimeStamp,
        role: 'assistant',
        type: target,
        isProcess: true,
    };
};

export const useChat = (pWrkId: string, pIdx: number, pInitialModel?: Model, pInitialMessages?: Message[]) => {
    const { msgBatch, sendMSG, socket } = useWebSocket();
    const [messages, setMessages] = useState<Message[]>(pInitialMessages ?? []);
    const [sInputValue, setInputValue] = useState('');
    const [sProcessingAnswer, setProcessingAnswer] = useState<boolean>(false);
    const [sInterruptId, setInterruptId] = useState<number>(-1);
    const [sSelectedModel, setSelectedModel] = useState<Model>(pInitialModel ?? { name: '', provider: '', model: '' });
    const [sModelList, setModelList] = useState<{ label: string; items: Model[] }[]>([]);

    const isComposingRef = useRef<boolean>(false);

    // WebSocket message processing
    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === pWrkId && msg.session?.idx === pIdx) {
                    if (msg.type === E_WS_TYPE.RPC_RSP) {
                        // LLM
                        if (RPC_LLM_LIST.includes(msg.session.method)) {
                            switch (msg.session.method) {
                                case E_RPC_METHOD.LLM_GET_MODELS:
                                    const sLabelList = Object.keys(msg[E_WS_KEY.RPC]?.result);
                                    setModelList(
                                        sLabelList.map((label: string) => {
                                            return { label: label, items: msg[E_WS_KEY.RPC]?.result[label] };
                                        })
                                    );
                                    break;
                            }
                        }
                    } else if (msg.type === E_WS_TYPE.MSG) {
                        /** ANSWER */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.ANSWER_START) setProcessingAnswer(true);
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.ANSWER_STOP) setProcessingAnswer(false);
                        /** DELTA */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_DELTA || msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_BLOCK_DELTA) {
                            const sType = msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_DELTA ? 'msg' : 'block';
                            setMessages((prev) => {
                                if (prev.length === 0) return prev;
                                const newPrev = [...prev].reverse();
                                const updateValue = newPrev.map((aMessage: Message) => {
                                    if (aMessage.type === sType && aMessage.isProcess === true) {
                                        return { ...aMessage, content: (aMessage.content ?? '') + (msg[E_WS_KEY.MSG].body?.data ?? '') };
                                    } else return aMessage;
                                });
                                return updateValue.reverse();
                            });
                        }
                        /** BLOCK */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_BLOCK_START) {
                            setMessages((prev) => [...prev, DEFAULT_DETAL_SET('block')]);
                        }
                        /** MSG */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_START) {
                            setMessages((prev) => [...prev, DEFAULT_DETAL_SET('msg')]);
                        }
                        /** STOP (BLOCK | MSG) */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_STOP || msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_BLOCK_STOP) {
                            const sType = msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_DELTA ? 'msg' : 'block';
                            setMessages((prev) => {
                                if (prev.length === 0) return prev;
                                const newPrev = [...prev].reverse();
                                const updateValue = newPrev.map((aMessage: Message) => {
                                    if (aMessage.type === sType && aMessage.isProcess === true) {
                                        return { ...aMessage, isProcess: false };
                                    } else return aMessage;
                                });
                                return updateValue.reverse();
                            });
                        }
                    }
                }
            }
        });
    }, [msgBatch, pWrkId, pIdx]);

    // Reset processing state when socket closes
    useEffect(() => {
        if (socket?.current === null) {
            setProcessingAnswer(false);
        }
    }, [socket?.current]);

    // Get model list
    const getModelList = () => {
        const sGenObj = WsRPC.LLM.GenModelsObj(pWrkId, pIdx);
        sendMSG(sGenObj);
    };

    // Send question message with text parameter
    const sendMessageWithText = (text: string) => {
        if (!text.trim()) return;
        if (!sSelectedModel.model.trim()) return;
        if (!sSelectedModel.name.trim()) return;
        if (!sSelectedModel.provider.trim()) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            content: text,
            timestamp: Date.now(),
            role: 'user',
            type: 'question',
            isProcess: false,
        };
        setMessages((prev) => [...prev, userMessage]);

        const sId = Math.floor(Math.random() * 1000000);
        setInterruptId(sId);

        sendMSG(
            WsMSG.GenMessageObj(pWrkId, pIdx, sId, {
                provider: sSelectedModel.provider,
                model: sSelectedModel.model,
                text: text,
            })
        );
    };

    // Send question message
    const handleSendMessage = () => {
        sendMessageWithText(sInputValue);
        setInputValue('');
    };

    // Send Interrupt message
    const handleInterruptMessage = () => {
        const sGenObj = WsMSG.GenInterruptObj(pWrkId, pIdx, sInterruptId);
        sendMSG(sGenObj);
    };

    // Check WebSocket connection
    const isConnected = socket.current?.readyState === WebSocket.OPEN;

    return {
        messages,
        setMessages,
        inputValue: sInputValue,
        setInputValue,
        isProcessingAnswer: sProcessingAnswer,
        selectedModel: sSelectedModel,
        setSelectedModel,
        modelList: sModelList,
        isComposingRef,
        isConnected,
        handleSendMessage,
        handleInterruptMessage,
        getModelList,
        sendMessageWithText,
    };
};
