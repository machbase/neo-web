import './ChatMessageList.scss';
import { Message } from '@/hooks/useChat';
import { ChatMessageItem, UserMessageAlign } from './ChatMessageItem';
import { LoadingDots } from './LoadingDots';

interface ChatMessageListProps {
    messages: Message[];
    pWrkId: string;
    pIdx: number;
    isProcessingAnswer?: boolean;
    userMessageAlign?: UserMessageAlign;
    scrollRef?: React.RefObject<HTMLDivElement>;
}

export const ChatMessageList = ({
    messages,
    pWrkId,
    pIdx,
    isProcessingAnswer = false,
    userMessageAlign = 'left',
    scrollRef,
}: ChatMessageListProps) => {
    return (
        <div ref={scrollRef} className="chat-messages chat-messages--simple">
            {messages.map((message) => (
                <div className="chat-message-item-wrap" key={message.id}>
                    <ChatMessageItem message={message} pWrkId={pWrkId} pIdx={pIdx} userMessageAlign={userMessageAlign} />
                </div>
            ))}
            {isProcessingAnswer && (
                <div className="chat-message-processing-icon-wrap">
                    <LoadingDots />
                </div>
            )}
            <div className="chat-messages-bottom-spacer" />
        </div>
    );
};
