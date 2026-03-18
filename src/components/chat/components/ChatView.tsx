import './ChatView.scss';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BsArrowUp } from 'react-icons/bs';
import { FaStop } from 'react-icons/fa';
import { VscChevronDown, VscChevronUp } from 'react-icons/vsc';
import { VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/hooks/useChat';
import { Model, ModelListType } from '@/utils/websocket';
import { ChatMessageList } from './ChatMessageList';
import { ModelDropDown } from './DropDown';
import { Button, Page } from '@/design-system/components';
import logoImg from '@/assets/image/neow_favicon.webp';

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
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const wasEmptyRef = useRef(messages.length === 0);
    const isModelSelected = !!(selectedModel.name && selectedModel.name.trim());
    const showSlideDown = wasEmptyRef.current && messages.length > 0;

    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    useEffect(() => {
        wasEmptyRef.current = messages.length === 0;
    }, [messages.length]);

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
            if (isModelSelected) handleSendMessage();
        }
    };

    const handleKeyDownEsc = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && !e.shiftKey && isProcessingAnswer) {
            e.preventDefault();
            handleInterruptMessage();
        }
    };

    const handleScrollToTop = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start', behavior: 'smooth' });
    }, []);

    const handleScrollToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' });
    }, []);

    return (
        <Page>
            <Page.Header />
            <Page.Body style={{ overflow: 'hidden' }}>
                <div className="chat-container" onKeyDown={handleKeyDownEsc}>
                    <div className={`chat-spacer ${messages.length === 0 ? 'chat-spacer--active' : ''}`} />
                    {messages.length === 0 && (
                        <div className="chat-welcome">
                            <img src={logoImg} alt="Machbase Neo" className="chat-welcome-logo" />
                            <p className="chat-welcome-text">How can I help you?</p>
                            {!isModelSelected && <p className="chat-welcome-hint">Please select a model to start chatting.</p>}
                        </div>
                    )}
                    {messages.length > 0 && (
                        <div className="chat-main">
                            <ChatMessageList
                                messages={messages}
                                pWrkId={pWrkId}
                                pIdx={pIdx}
                                isProcessingAnswer={isProcessingAnswer}
                                useVirtualScroll
                                userMessageAlign="right"
                                virtuosoRef={virtuosoRef}
                                onAtTopStateChange={(atTop) => setShowScrollTop(!atTop)}
                                onAtBottomStateChange={(atBottom) => setShowScrollBottom(!atBottom)}
                            />
                        </div>
                    )}
                    {/* Scroll buttons */}
                    {messages.length > 0 && (showScrollTop || showScrollBottom) && (
                        <div className="chat-scroll-buttons">
                            {showScrollTop && (
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    shadow
                                    isToolTip
                                    toolTipContent="Scroll to top"
                                    toolTipPlace="left"
                                    icon={<VscChevronUp size={16} />}
                                    onClick={handleScrollToTop}
                                    aria-label="Scroll to top"
                                />
                            )}
                            {showScrollBottom && (
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    shadow
                                    isToolTip
                                    toolTipContent="Scroll to bottom"
                                    toolTipPlace="left"
                                    icon={<VscChevronDown size={16} />}
                                    onClick={handleScrollToBottom}
                                    aria-label="Scroll to bottom"
                                />
                            )}
                        </div>
                    )}
                    {/* Input */}
                    <div className={`chat-input-wrap ${showSlideDown ? 'chat-input-wrap--slide-down' : ''}`} aria-disabled={isProcessingAnswer}>
                        <div className="chat-input-container">
                            <div className="chat-input-row">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDownEnter}
                                    onCompositionStart={() => (isComposingRef.current = true)}
                                    onCompositionEnd={() => (isComposingRef.current = false)}
                                    placeholder={isModelSelected ? `Ask ${selectedModel.provider ?? ''}...` : 'Select a model first...'}
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
                                        <Button size="sm" variant="secondary" onClick={handleInterruptMessage} icon={<FaStop />} />
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={handleSendMessage}
                                            disabled={!isConnected || !inputValue.trim() || !isModelSelected}
                                            icon={<BsArrowUp />}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`chat-spacer ${messages.length === 0 ? 'chat-spacer--active' : ''}`} />
                </div>
            </Page.Body>
        </Page>
    );
};
