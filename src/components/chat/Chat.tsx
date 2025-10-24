import { useChat } from '@/hooks/useChat';
import { ChatView } from './components/ChatView';

interface ChatProps {
    pWrkId: string;
    pIdx: number;
}

export const Chat = ({ pWrkId, pIdx }: ChatProps) => {
    const chatLogic = useChat(pWrkId, pIdx);

    return <ChatView {...chatLogic} pWrkId={pWrkId} pIdx={pIdx} />;
};
