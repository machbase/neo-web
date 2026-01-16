import './RenderMd.scss';
import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { E_RPC_METHOD, E_WS_TYPE } from '@/recoil/websocket';
import { WsRPC } from '@/utils/websocket';
import { RpcResponseParser } from '@/utils/Chat/RpcResponseParser';

interface RenderMdProps {
    pContent: string;
    pWrkId: string;
    pIdx: number;
    pIsInterrupt: boolean;
}

export const RenderMd = ({ pContent, pWrkId, pIdx, pIsInterrupt }: RenderMdProps) => {
    const { msgBatch, sendMSG } = useWebSocket();
    const [sElement, setElement] = useState<string | TrustedHTML>('');
    const [sRenderId, setRenderId] = useState<number>(-1);
    const renderContainerRef = useRef<HTMLDivElement>(null);

    const getRender = () => {
        const sId = Math.floor(Math.random() * 1000000);
        setRenderId(sId);
        const sGenObj = WsRPC.MD.GenRenderObj(pWrkId, pIdx, pContent, true, sId);
        sendMSG(sGenObj);
    };

    useEffect(() => {
        if (!pIsInterrupt) getRender();
    }, []);

    useEffect(() => {
        if (msgBatch.length === 0) return;

        msgBatch?.forEach((msg) => {
            if (msg && Object.keys(msg).length > 0) {
                if (msg.session?.id === pWrkId && msg.session?.idx === pIdx) {
                    if (msg.type === E_WS_TYPE.RPC_RSP && msg.rpc?.id === sRenderId) {
                        if (msg.session.method === E_RPC_METHOD.MD_RENDER) {
                            const { rpcState, rpcData } = RpcResponseParser(msg);
                            if (rpcState) setElement(rpcData);
                            else setElement('');
                        }
                    }
                }
            }
        });
    }, [msgBatch, pWrkId, pIdx]);

    // Add copy buttons to code blocks
    useEffect(() => {
        if (!renderContainerRef.current || !sElement) return;

        const container = renderContainerRef.current;
        const codeBlocks = container.querySelectorAll('pre code');

        codeBlocks.forEach((codeElement) => {
            const preElement = codeElement.parentElement as HTMLPreElement;
            if (!preElement) return;

            // Skip if copy button already exists
            if (preElement.querySelector('.code-copy-button')) return;

            // Set pre element to relative position
            preElement.style.position = 'relative';

            // Create copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-button';
            copyButton.innerHTML = `<svg
                                viewBox="0 0 24 24"
                                fill="rgba(255, 255, 255, 0.5)"
                                height="100%"
                                width="100%"
                            >
                                <path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z" />
                            </svg>`;

            // Copy functionality
            copyButton.addEventListener('click', () => {
                // Clone the code element to manipulate it
                const clonedElement = codeElement.cloneNode(true) as HTMLElement;

                // Remove all line number elements (with user-select:none style) from the clone
                const lineNumbers = clonedElement.querySelectorAll('span[style*="user-select:none"], span[style*="-webkit-user-select:none"]');
                lineNumbers.forEach((el) => el.remove());

                // Get the text content from the cleaned clone
                const code = clonedElement.textContent || '';
                const originalHTML = copyButton.innerHTML;

                // Fallback method using textarea (works in all contexts)
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        // Show check icon on success
                        copyButton.innerHTML = `<svg viewBox="0 0 24 24" fill="rgba(0, 255, 0, 0.8)" height="100%" width="100%">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                            </svg>`;
                        setTimeout(() => {
                            copyButton.innerHTML = originalHTML;
                        }, 2000);
                    } else {
                        // Show error icon on failure
                        copyButton.innerHTML = `<svg viewBox="0 0 24 24" fill="rgba(255, 0, 0, 0.8)" height="100%" width="100%">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                            </svg>`;
                        setTimeout(() => {
                            copyButton.innerHTML = originalHTML;
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Failed to copy:', err);
                    copyButton.innerHTML = `<svg viewBox="0 0 24 24" fill="rgba(255, 0, 0, 0.8)" height="100%" width="100%">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                        </svg>`;
                    setTimeout(() => {
                        copyButton.innerHTML = originalHTML;
                    }, 2000);
                } finally {
                    document.body.removeChild(textArea);
                }
            });

            preElement.appendChild(copyButton);
        });
    }, [sElement]);

    return (
        <div
            ref={renderContainerRef}
            id={`render-md-${sRenderId}`}
            className={`mrk-form markdown-body`}
            style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
            dangerouslySetInnerHTML={{ __html: sElement }}
        />
    );
};
