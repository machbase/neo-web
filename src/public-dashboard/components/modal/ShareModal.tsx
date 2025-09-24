import './ShareModal.scss';
import { Close, Copy, Share } from '../../assets/icons/Icon';
import { Success } from '../toast/Toast';
import { useState } from 'react';
import useEsc from '../../hooks/useEsc';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareModal = ({ isOpen, onClose }: ShareModalProps) => {
    const currentUrl = window.location.href;
    const [activeTab, setActiveTab] = useState<'iframe' | 'embed'>('iframe');

    useEsc(() => isOpen && onClose());

    const createIframeCode = (url: string) => `<iframe width="100%" height="100%" src="${url}" frameborder="0" allowfullscreen></iframe>`;

    const createEmbedCode = (url: string) => `<embed width="100%" height="100%" src="${url}">`;

    const handleCopyToClipboard = async (text: string, type: 'link' | 'iframe' | 'embed') => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            fallbackCopyToClipboard(text, type);
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            const messages = {
                link: 'Link copied to clipboard',
                iframe: 'iFrame code copied to clipboard',
                embed: 'Embed code copied to clipboard'
            };
            Success(messages[type]);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            fallbackCopyToClipboard(text, type);
        }
    };

    const fallbackCopyToClipboard = (text: string, type: 'link' | 'iframe' | 'embed') => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            const messages = {
                link: 'Link copied to clipboard',
                iframe: 'iFrame code copied to clipboard',
                embed: 'Embed code copied to clipboard'
            };
            Success(messages[type]);
        } catch (error) {
            console.error('Fallback copy failed:', error);
        } finally {
            document.body.removeChild(textArea);
        }
    };

    if (!isOpen) return null;

    return (
        <div>
            <div onClick={onClose} className="share-modal-cover"></div>
            <div className="share-modal">
                <div className="share-modal-header">
                    <div className="share-modal-title-wrapper">
                        <Share className="share-modal-icon" />
                        <span className="share-modal-title">Share</span>
                    </div>
                    <div>
                        <Close className="close-button" onClick={onClose} />
                    </div>
                </div>

                <div className="share-modal-body">
                    <div className="share-content">
                        <div className="share-section">
                            {/* Social Share Buttons */}
                            <div className="social-share-buttons">
                                <button
                                    className="social-share-btn facebook"
                                    onClick={() => window.open(`https://www.facebook.com/dialog/share?app_id=87741124305&href=${encodeURIComponent(currentUrl)}&display=popup`, '_blank')}
                                    title="Share on Facebook"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </button>
                                <button
                                    className="social-share-btn twitter"
                                    onClick={() => window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(currentUrl)}`, '_blank')}
                                    title="Share on X (Twitter)"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </button>
                                <button
                                    className="social-share-btn email"
                                    onClick={() => window.open(`mailto:?body=${encodeURIComponent(currentUrl)}`, '_blank')}
                                    title="Share via Email"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                    </svg>
                                </button>
                                <button
                                    className="social-share-btn whatsapp"
                                    onClick={() => window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(currentUrl)}&type=custom_url&app_absent=0`, '_blank')}
                                    title="Share on WhatsApp"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                                    </svg>
                                </button>
                            </div>

                            <div className="share-input-wrapper">
                                <textarea
                                    value={currentUrl}
                                    readOnly
                                    className="share-input"
                                    onClick={(e) => e.currentTarget.select()}
                                    rows={1}
                                />
                                <button
                                    className="copy-button"
                                    onClick={() => handleCopyToClipboard(currentUrl, 'link')}
                                >
                                    <Copy />
                                </button>
                            </div>

                            {/* Embed Tabs */}
                            <div className="embed-section">
                                <div className="embed-tabs">
                                    <button
                                        className={`embed-tab ${activeTab === 'iframe' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('iframe')}
                                    >
                                        iframe
                                    </button>
                                    <button
                                        className={`embed-tab ${activeTab === 'embed' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('embed')}
                                    >
                                        embed
                                    </button>
                                </div>

                                <div className="embed-input-wrapper">
                                    <textarea
                                        value={activeTab === 'iframe' ? createIframeCode(currentUrl) : createEmbedCode(currentUrl)}
                                        readOnly
                                        className="embed-input"
                                        rows={2}
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        className="copy-button"
                                        onClick={() => handleCopyToClipboard(
                                            activeTab === 'iframe' ? createIframeCode(currentUrl) : createEmbedCode(currentUrl),
                                            activeTab
                                        )}
                                    >
                                        <Copy />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;