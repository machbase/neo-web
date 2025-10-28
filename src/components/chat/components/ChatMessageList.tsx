import './ChatMessageList.scss';
import { useEffect, useRef } from 'react';
import { Message } from '@/hooks/useChat';
import { ChatMessageItem } from './ChatMessageItem';
import { LoadingDots } from './LoadingDots';

interface ChatMessageListProps {
    messages: Message[];
    pWrkId: string;
    pIdx: number;
    isProcessingAnswer?: boolean;
    autoScroll?: boolean;
}

export const ChatMessageList = ({ messages, pWrkId, pIdx, isProcessingAnswer = false, autoScroll = true }: ChatMessageListProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    return (
        <div className="chat-messages">
            {messages.map((message) => (
                <ChatMessageItem key={message.id} message={message} pWrkId={pWrkId} pIdx={pIdx} />
            ))}
            {isProcessingAnswer && (
                <div className="chat-message-processing-icon-wrap">
                    <LoadingDots />
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
