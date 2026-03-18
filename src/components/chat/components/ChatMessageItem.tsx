import './ChatMessageItem.scss';
import { SaveCricle } from '@/assets/icons/Icon';
import { Message } from '@/hooks/useChat';
import { RenderMd } from './RenderMd';
import { ErrorBanner } from './ErrorBanner';

export type UserMessageAlign = 'left' | 'right';

interface ChatMessageItemProps {
    message: Message;
    pWrkId: string;
    pIdx: number;
    userMessageAlign?: UserMessageAlign;
}

export const ChatMessageItem = ({ message, pWrkId, pIdx, userMessageAlign = 'left' }: ChatMessageItemProps) => {
    if (message.type === 'error')
        return (
            <div className="chat-message-error">
                <ErrorBanner message={message.content} />
            </div>
        );

    return (
        <div key={message.id} className={`chat-message ${message.role} ${message.role === 'user' ? `user--${userMessageAlign}` : ''}`}>
            <div className="chat-message-header">
                {message.role !== 'user' && message.type !== 'msg' ? (
                    message.isProcess ? (
                        <SaveCricle width={6} height={6} color="rgb(0, 108, 210)" />
                    ) : (
                        <SaveCricle width={6} height={6} />
                    )
                ) : null}
            </div>

            {message.isProcess || message.role === 'user' ? (
                <div className="chat-message-content">{message.content}</div>
            ) : (
                <RenderMd pContent={message.content} pIsInterrupt={message.isInterrupt} pWrkId={pWrkId} pIdx={pIdx} />
            )}
        </div>
    );
};
