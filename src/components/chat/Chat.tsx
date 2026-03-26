import { usePkgChat } from '@/hooks/usePkgChat';
import { ChatView } from './components/ChatView';

interface ChatProps {
    pWrkId: string;
    pIdx: number;
}

export const Chat = ({ pWrkId, pIdx }: ChatProps) => {
    const chatLogic = usePkgChat(pWrkId, pIdx);

    return <ChatView {...chatLogic} pWrkId={pWrkId} pIdx={pIdx} />;
};
