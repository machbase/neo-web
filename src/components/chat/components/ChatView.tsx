import './ChatView.scss';
import React, { useEffect, useRef } from 'react';
import { BsArrowUp } from 'react-icons/bs';
import { FaStop } from 'react-icons/fa';
import { Message } from '@/hooks/useChat';
import { Model, ModelListType } from '@/utils/websocket';
import { ChatMessageList } from './ChatMessageList';
import { ModelDropDown } from './DropDown';

interface ChatViewProps {
    pIdx: number;
    pWrkId: string;
    messages: Message[];
    modelList: ModelListType[];
    inputValue: string;
    isConnected: boolean;
    selectedModel: Model;
    isComposingRef: React.MutableRefObject<boolean>;
    isProcessingAnswer: boolean;
    getListModels: () => void;
    setInputValue: (value: string) => void;
    setSelectedModel: (model: Model) => void;
    handleSendMessage: () => void;
    handleInterruptMessage: () => void;
}

export const ChatView = ({
    pIdx,
    pWrkId,
    messages,
    modelList,
    inputValue,
    isConnected,
    selectedModel,
    isComposingRef,
    isProcessingAnswer,
    getListModels,
    setInputValue,
    setSelectedModel,
    handleSendMessage,
    handleInterruptMessage,
}: ChatViewProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 200;

            if (!inputValue.trim()) {
                textarea.style.height = 'auto';
                textarea.style.overflowY = 'hidden';
                return;
            }

            if (scrollHeight > maxHeight) {
                textarea.style.height = `${maxHeight}px`;
                textarea.style.overflowY = 'auto';
            } else {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            }
        }
    };

    const handleKeyDownEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleKeyDownEsc = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && !e.shiftKey && isProcessingAnswer) {
            e.preventDefault();
            handleInterruptMessage();
        }
    };

    return (
        <div style={{ display: 'flex', flex: 1, overflow: 'auto', height: '100%', width: '100%' }}>
            <div className="chat-container">
                <div className="chat-main">
                    <ChatMessageList messages={messages} pWrkId={pWrkId} pIdx={pIdx} isProcessingAnswer={isProcessingAnswer} />
                    {/* Input */}
                    <div className="chat-input-wrap" aria-disabled={isProcessingAnswer} onKeyDown={handleKeyDownEsc}>
                        <div className="chat-input-container">
                            <div className="chat-input-row">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDownEnter}
                                    onCompositionStart={() => (isComposingRef.current = true)}
                                    onCompositionEnd={() => (isComposingRef.current = false)}
                                    placeholder={`Ask ${selectedModel.provider ?? ''}...`}
                                    disabled={!isConnected}
                                    className="chat-input"
                                    rows={1}
                                />
                            </div>
                            <div className="divider" />
                            <div className="chat-controls">
                                <div className="chat-controls-left">
                                    <ModelDropDown pList={modelList} pSelectedItem={selectedModel} onSelect={setSelectedModel} onFetch={getListModels} />
                                </div>
                                <div className="chat-controls-right">
                                    {isProcessingAnswer ? (
                                        <button onClick={handleInterruptMessage} className="chat-send-button">
                                            <FaStop className="chat-send-icon" />
                                        </button>
                                    ) : (
                                        <button onClick={handleSendMessage} disabled={!isConnected || !inputValue.trim()} className="chat-send-button">
                                            <BsArrowUp className="chat-send-icon" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
