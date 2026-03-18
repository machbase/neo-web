import './ChatMessageList.scss';
import { useCallback, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@/hooks/useChat';
import { ChatMessageItem, UserMessageAlign } from './ChatMessageItem';
import { LoadingDots } from './LoadingDots';

interface ChatMessageListProps {
    messages: Message[];
    pWrkId: string;
    pIdx: number;
    isProcessingAnswer?: boolean;
    autoScroll?: boolean;
    useVirtualScroll?: boolean;
    userMessageAlign?: UserMessageAlign;
    onAtTopStateChange?: (atTop: boolean) => void;
    onAtBottomStateChange?: (atBottom: boolean) => void;
    virtuosoRef?: React.MutableRefObject<VirtuosoHandle | null>;
}

export const ChatMessageList = ({
    messages,
    pWrkId,
    pIdx,
    isProcessingAnswer = false,
    autoScroll = true,
    useVirtualScroll = false,
    userMessageAlign = 'left',
    onAtTopStateChange,
    onAtBottomStateChange,
    virtuosoRef: externalRef,
}: ChatMessageListProps) => {
    const internalRef = useRef<VirtuosoHandle | null>(null);
    const ref = externalRef || internalRef;

    const virtuosoCallbackRef = useCallback(
        (instance: VirtuosoHandle | null) => {
            ref.current = instance;
        },
        [ref]
    );

    const followOutput = useCallback(
        (isAtBottom: boolean) => {
            if (isAtBottom && autoScroll) return 'smooth';
            return false;
        },
        [autoScroll]
    );

    if (!useVirtualScroll) {
        return (
            <div className="chat-messages chat-messages--simple">
                {messages.map((message) => (
                    <ChatMessageItem key={message.id} message={message} pWrkId={pWrkId} pIdx={pIdx} userMessageAlign={userMessageAlign} />
                ))}
                {isProcessingAnswer && (
                    <div className="chat-message-processing-icon-wrap">
                        <LoadingDots />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="chat-messages">
            <Virtuoso
                ref={virtuosoCallbackRef}
                data={messages}
                computeItemKey={(_index, message) => message.id}
                followOutput={followOutput}
                increaseViewportBy={{ top: 500, bottom: 200 }}
                atTopStateChange={onAtTopStateChange}
                atBottomStateChange={onAtBottomStateChange}
                itemContent={(_index, message) => (
                    <div className="chat-message-item-wrap">
                        <ChatMessageItem message={message} pWrkId={pWrkId} pIdx={pIdx} userMessageAlign={userMessageAlign} />
                    </div>
                )}
                components={{
                    Footer: () =>
                        isProcessingAnswer ? (
                            <div className="chat-message-processing-icon-wrap">
                                <LoadingDots />
                            </div>
                        ) : null,
                }}
            />
        </div>
    );
};
