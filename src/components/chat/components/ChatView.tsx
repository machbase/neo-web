import './ChatView.scss';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BsArrowUp } from 'react-icons/bs';
import { FaStop } from 'react-icons/fa';
import { VscChevronDown, VscChevronUp, VscDebugDisconnect, VscClearAll } from 'react-icons/vsc';
import { Message } from '@/hooks/useChat';
import { PkgProvider, PkgSelectedModel } from '@/hooks/usePkgChat';
import { ChatMessageList } from './ChatMessageList';
import { ArrowDown } from '@/assets/icons/Icon';
import { Button, Menu, Page } from '@/design-system/components';
import logoImg from '@/assets/image/neow_favicon.webp';
import styles from './DropDown.module.scss';

interface ChatViewProps {
    pIdx: number;
    pWrkId: string;
    messages: Message[];
    providerList: PkgProvider[];
    modelsMessage: string;
    inputValue: string;
    isConnected: boolean;
    reconnect: () => void;
    selectedModel: PkgSelectedModel;
    isComposingRef: React.MutableRefObject<boolean>;
    isProcessingAnswer: boolean;
    getListModels: () => void;
    setInputValue: (value: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setSelectedModel: (model: PkgSelectedModel) => void;
    handleSendMessage: () => void;
    handleInterruptMessage: () => void;
}

export const ChatView = ({
    pIdx,
    pWrkId,
    messages,
    providerList,
    modelsMessage,
    inputValue,
    isConnected,
    reconnect,
    selectedModel,
    isComposingRef,
    isProcessingAnswer,
    getListModels,
    setInputValue,
    setMessages,
    setSelectedModel,
    handleSendMessage,
    handleInterruptMessage,
}: ChatViewProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const wasEmptyRef = useRef(messages.length === 0);
    const isModelSelected = !!(selectedModel.name && selectedModel.name.trim());
    const showSlideDown = wasEmptyRef.current && messages.length > 0;

    const SCROLL_THRESHOLD = 100;
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [sIsModelLoading, setIsModelLoading] = useState(false);

    useEffect(() => {
        wasEmptyRef.current = messages.length === 0;
    }, [messages.length]);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);

    useEffect(() => {
        if (providerList.length > 0 || modelsMessage) setIsModelLoading(false);
    }, [providerList, modelsMessage]);

    // Scroll state tracking
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = el;
            setShowScrollTop(scrollTop > SCROLL_THRESHOLD);
            setShowScrollBottom(scrollTop + clientHeight < scrollHeight - SCROLL_THRESHOLD);
        };

        el.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => el.removeEventListener('scroll', handleScroll);
    }, [messages.length > 0]);

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

    const handleSendAndScroll = () => {
        handleSendMessage();
        requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    const handleKeyDownEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            if (isModelSelected) handleSendAndScroll();
        }
    };

    const handleKeyDownEsc = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && !e.shiftKey && isProcessingAnswer) {
            e.preventDefault();
            handleInterruptMessage();
        }
    };

    const handleScrollToTop = useCallback(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleScrollToBottom = useCallback(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, []);

    const handleClearMessages = () => {
        setMessages([]);
    };

    const handleModelMenuOpen = () => {
        setIsModelLoading(true);
        getListModels();
    };

    const handleModelSelect = (provider: string, model: { name: string; model_id?: string }) => {
        setSelectedModel({
            provider,
            model: model.model_id ?? model.name,
            name: model.name,
        });
    };

    return (
        <Page>
            <Page.Header>
                <div className="chat-header">
                    <div className="chat-header-left">
                        <div className={`chat-header-status ${isConnected ? 'chat-header-status--connected' : 'chat-header-status--disconnected'}`}>
                            <span className="chat-header-status-dot" />
                            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        {!isConnected && (
                            <Button size="sm" variant="ghost" icon={<VscDebugDisconnect size={14} />} onClick={reconnect}>
                                Reconnect
                            </Button>
                        )}
                    </div>
                    {messages.length > 0 && (
                        <Button size="sm" variant="ghost" icon={<VscClearAll size={14} />} onClick={handleClearMessages}>
                            Clear
                        </Button>
                    )}
                </div>
            </Page.Header>
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
                                userMessageAlign="right"
                                scrollRef={scrollRef}
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
                                    <Menu.Root className={styles['dropdown-container']}>
                                        <Menu.Trigger>
                                            <Button size="sm" variant="ghost" onClick={handleModelMenuOpen}>
                                                <p>{isModelSelected ? `${selectedModel.provider} / ${selectedModel.name}` : 'Select model'}</p>
                                                <ArrowDown size={16} />
                                            </Button>
                                        </Menu.Trigger>
                                        <Menu.Content className={styles['dropdown-menu']}>
                                            {sIsModelLoading ? (
                                                <div className={styles['dropdown-menu-loading']}>
                                                    <Menu.Item disabled>Loading...</Menu.Item>
                                                </div>
                                            ) : modelsMessage ? (
                                                <div className={styles['dropdown-menu-body']}>
                                                    <Menu.Item disabled>{modelsMessage}</Menu.Item>
                                                </div>
                                            ) : (
                                                providerList.map((provider) => (
                                                    <div className={styles['dropdown-menu-body']} key={provider.provider}>
                                                        <div className={styles['dropdown-menu-label']}>{provider.provider}</div>
                                                        {provider.models.map((model) => {
                                                            const isSelected =
                                                                selectedModel.provider === provider.provider &&
                                                                selectedModel.model === (model.model_id ?? model.name);
                                                            return (
                                                                <Menu.Item
                                                                    key={`${provider.provider}-${model.name}`}
                                                                    className={isSelected ? 'selected' : ''}
                                                                    onClick={() => handleModelSelect(provider.provider, model)}
                                                                >
                                                                    {model.name}
                                                                </Menu.Item>
                                                            );
                                                        })}
                                                    </div>
                                                ))
                                            )}
                                        </Menu.Content>
                                    </Menu.Root>
                                </div>
                                <div className="chat-controls-right">
                                    {isProcessingAnswer ? (
                                        <Button size="sm" variant="secondary" onClick={handleInterruptMessage} icon={<FaStop />} />
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={handleSendAndScroll}
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
