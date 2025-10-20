import './Chat.scss';
import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { ArrowDown, Gear, SaveCricle } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';
import { BsArrowUp } from 'react-icons/bs';
import { IconButton } from '../buttons/IconButton';
import { GrClearOption } from 'react-icons/gr';
import { E_MSG_TYPE, E_RPC_METHOD, E_WS_KEY, E_WS_TYPE, RPC_LLM_LIST } from '@/recoil/websocket';
import { Model, WsMSG, WsRPC } from '@/utils/websocket';
import { ChatModal } from './ChatModal';
import { FaStop } from 'react-icons/fa';

interface Message {
    id: string;
    content: string;
    timestamp: number;
    role: 'user' | 'assistant';
    type: 'block' | 'msg' | 'answer' | 'question';
    isProcess: boolean;
}
interface ChatProps {
    pIsActiveTab: boolean;
    pWrkId: string;
    pIdx: number;
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

export const Chat = ({ pWrkId, pIdx }: ChatProps) => {
    const { msgBatch, sendMSG, socket } = useWebSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [sInputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef<boolean>(false);
    const [sIsChatModal, setIsChatModal] = useState<boolean>(false);
    const [sProcessingAnswer, setProcessingAnswer] = useState<boolean>(false);
    const [sInterruptId, setInterruptId] = useState<number>(-1);
    /** MODEL */
    const [sSelectedModel, setSelectedModel] = useState<Model>({ name: '', provider: '', model: '' });
    const [sModelList, setModelList] = useState<{ label: string; items: Model[] }[]>([]);

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
                        // RENDER (E_RPC_METHOD.MD_RENDER)
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
                            // setProcessingBlock(true);
                        }
                        /** MSG */
                        if (msg[E_WS_KEY.MSG].type === E_MSG_TYPE.STREAM_MSG_START) {
                            setMessages((prev) => [...prev, DEFAULT_DETAL_SET('msg')]);
                            // setProcessingMsg(true);
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
                            // if (sType === 'msg') setProcessingMsg(false);
                            // if (sType === 'block') setProcessingBlock(false);
                        }
                    }
                }
            }
        });
    }, [msgBatch, pWrkId, pIdx]);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    useEffect(() => {
        adjustTextareaHeight();
    }, [sInputValue]);
    useEffect(() => {
        if (socket?.current === null) setProcessingAnswer(false);
    }, [socket?.current]);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 200;

            if (scrollHeight > maxHeight) {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            }
        }
    };

    const getModelList = () => {
        const sGenObj = WsRPC.LLM.GenModelsObj(pWrkId, pIdx);
        sendMSG(sGenObj);
    };

    // Send question message
    const handleSendMessage = () => {
        if (!sInputValue.trim()) return;
        if (!sSelectedModel.model.trim()) return;
        if (!sSelectedModel.name.trim()) return;
        if (!sSelectedModel.provider.trim()) return;

        const sId = Math.floor(Math.random() * 1000000);
        setInterruptId(sId);

        sendMSG(
            WsMSG.GenMessageObj(pWrkId, pIdx, sId, {
                provider: sSelectedModel.provider,
                model: sSelectedModel.model,
                text: sInputValue,
            })
        );

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            content: sInputValue,
            timestamp: Date.now(),
            role: 'user',
            type: 'question',
            isProcess: false,
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
    };
    // Send Interrupt message
    const handleInterruptMessage = () => {
        const sGenObj = WsMSG.GenInterruptObj(pWrkId, pIdx, sInterruptId);
        sendMSG(sGenObj);
    };

    // provider & model management
    const handleMGMT = () => {
        setIsChatModal(true);
    };

    // Enter
    const handleKeyDownEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    // Esc
    const handleKeyDownEsc = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && !e.shiftKey && sProcessingAnswer) {
            e.preventDefault();
            handleInterruptMessage();
        }
    };

    // WebSocket
    const isConnected = socket.current?.readyState === WebSocket.OPEN;

    return (
        <div className="chat-container">
            <div className="chat-main">
                <div className="chat-messages">
                    {messages.map((message) => (
                        <div key={message.id} className={`chat-message ${message.role}`}>
                            <div className="chat-message-header">
                                {message.role !== 'user' && message.type !== 'msg' ? (
                                    message.isProcess ? (
                                        <SaveCricle width={6} height={6} color="rgb(0, 108, 210)" />
                                    ) : (
                                        <SaveCricle width={6} height={6} />
                                    )
                                ) : null}
                            </div>
                            {message.isProcess ? (
                                <div className="chat-message-content">{message.content}</div>
                            ) : (
                                <RenderMd pContent={message.content} pWrkId={pWrkId} pIdx={pIdx} />
                            )}
                        </div>
                    ))}
                    {sProcessingAnswer && (
                        <div className="chat-message-processing-icon-wrap">
                            <LoadingDots />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                {/* Input */}
                <div className="chat-input-container" aria-disabled={sProcessingAnswer} onKeyDown={handleKeyDownEsc}>
                    <div className="chat-input-row">
                        <textarea
                            ref={textareaRef}
                            value={sInputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDownEnter}
                            onCompositionStart={() => (isComposingRef.current = true)}
                            onCompositionEnd={() => (isComposingRef.current = false)}
                            placeholder={`Ask ${sSelectedModel.provider ?? ''}...`}
                            disabled={!isConnected}
                            className="chat-input"
                            rows={1}
                        />
                    </div>
                    <div className="divider" />
                    <div className="chat-controls">
                        <div className="chat-controls-left">
                            <DropDown pList={sModelList} pSelectedItem={sSelectedModel} onSelect={setSelectedModel} onFetch={getModelList} />
                        </div>
                        <div className="chat-controls-right">
                            {sProcessingAnswer ? (
                                <button onClick={handleInterruptMessage} className="chat-send-button">
                                    <FaStop className="chat-send-icon" />
                                </button>
                            ) : (
                                <button onClick={handleSendMessage} disabled={!isConnected || !sInputValue.trim()} className="chat-send-button">
                                    <BsArrowUp className="chat-send-icon" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="chat-clear-button-container">
                <IconButton
                    pIsToopTip
                    pToolTipContent="Clear"
                    pToolTipId="wrk-tab-panel-clear"
                    pWidth={40}
                    pHeight={40}
                    pIcon={<GrClearOption size={18} />}
                    pIsActiveHover
                    onClick={() => setMessages([])}
                />
                <IconButton
                    pIsToopTip
                    pToolTipContent="Setting"
                    pToolTipId="wrk-tab-panel-option"
                    pWidth={40}
                    pHeight={40}
                    pIcon={<Gear size={18} />}
                    pIsActiveHover
                    onClick={handleMGMT}
                />
            </div>
            {sIsChatModal && <ChatModal pWrkId={pWrkId} pIdx={pIdx} pIsOpen={sIsChatModal} pSetIsOpen={setIsChatModal} />}
        </div>
    );
};

const RenderMd = ({ pContent, pWrkId, pIdx }: { pContent: string; pWrkId: string; pIdx: number }) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sElement, setElement] = useState<string | TrustedHTML>('');
    const [sRenderId, setRenderId] = useState<number>(-1);

    const getRender = () => {
        const sId = Math.floor(Math.random() * 1000000);
        setRenderId(sId);
        const sGenObj = WsRPC.MD.GenRenderObj(pWrkId, pIdx, pContent, true, sId);
        sendMSG(sGenObj);
    };

    useEffect(() => {
        getRender();
    }, [pContent]);

    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === pWrkId && msg.session?.idx === pIdx) {
                    if (msg.type === E_WS_TYPE.RPC_RSP && msg.rpc?.id === sRenderId) {
                        if (msg.session.method === E_RPC_METHOD.MD_RENDER) {
                            setElement(msg[E_WS_KEY.RPC]?.result ?? '');
                        }
                    }
                }
            }
        });
    }, [msgBatch, pWrkId, pIdx]);

    return <div dangerouslySetInnerHTML={{ __html: sElement }} />;
};

const LoadingDots = () => {
    return (
        <div className="loading-dots">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
        </div>
    );
};

const DropDown = ({
    pList,
    pSelectedItem,
    onSelect,
    onFetch,
}: {
    pList: { label: string; items: Model[] }[];
    pSelectedItem: Model;
    onSelect: (value: Model) => void;
    onFetch: () => void;
}) => {
    const [sShowLang, setShowLang] = useState<boolean>(false);
    const dropDownRef = useRef(null);

    useOutsideClick(dropDownRef, () => setShowLang(false));

    const handleSelect = (item: Model) => {
        onSelect?.(item);
        setShowLang(false);
    };

    return (
        <div ref={dropDownRef} className="dropdown-container">
            <div
                className="dropdown-content"
                onClick={() => {
                    setShowLang(!sShowLang);
                    onFetch();
                }}
            >
                <div className="dropdown-title">
                    <span>{pSelectedItem.name === '' ? 'Please select' : pSelectedItem.name}</span>
                </div>
                <ArrowDown style={{ transform: sShowLang ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </div>
            {sShowLang && (
                <div className="dropdown-menu">
                    {pList.map((aItem: { label: string; items: Model[] }, aIdx: number) => {
                        return (
                            <div key={aItem.label + aIdx.toString()}>
                                <div className="dropdown-menu-label">{aItem.label}</div>
                                {aItem.items?.map((bItem, bIdx: number) => {
                                    const isSelected = bItem.name === pSelectedItem.name && bItem.provider === pSelectedItem.provider && bItem.model === pSelectedItem.model;
                                    return (
                                        <div
                                            key={aItem.label + bItem.name + aIdx.toString() + bIdx.toString()}
                                            className={`dropdown-menu-item ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(bItem);
                                            }}
                                        >
                                            {bItem.name}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
