import './ChatMessageItem.scss';
import { SaveCricle } from '@/assets/icons/Icon';
import { Message } from '@/hooks/useChat';
import { RenderMd } from './RenderMd';
import { ErrorBanner } from './ErrorBanner';

interface ChatMessageItemProps {
    message: Message;
    pWrkId: string;
    pIdx: number;
}

export const ChatMessageItem = ({ message, pWrkId, pIdx }: ChatMessageItemProps) => {
    if (message.type === 'error')
        return (
            <div className="chat-message-error">
                <ErrorBanner message={message.content} />
            </div>
        );

    return (
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

            {message.isProcess || message.role === 'user' ? (
                <div className="chat-message-content">{message.content}</div>
            ) : (
                <RenderMd pContent={message.content} pIsInterrupt={message.isInterrupt} pWrkId={pWrkId} pIdx={pIdx} />
            )}
        </div>
    );
};
