import './ShareButton.scss';
import { useState, useRef, useEffect } from 'react';
import { IconButton } from './IconButton';
import { Share } from '../../assets/icons/Icon';
import Menu from '../contextMenu/Menu';

export const ShareButton = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);

    const handleShareClick = (event: React.MouseEvent) => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleCopyLink = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Failed to copy link:', error);
            fallbackCopyToClipboard(window.location.href);
        }
    };

    const handleCopyEmbedCode = async () => {
        try {
            const currentUrl = window.location.href;
            const embedCode = `<html><embed src="${currentUrl}"></html>`;
            await navigator.clipboard.writeText(embedCode);
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Failed to copy embed code:', error);
            const currentUrl = window.location.href;
            const embedCode = `<html><embed src="${currentUrl}"></html>`;
            fallbackCopyToClipboard(embedCode);
        }
    };

    const fallbackCopyToClipboard = (text: string) => {
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
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Fallback copy failed:', error);
        } finally {
            document.body.removeChild(textArea);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div className="share-button-wrapper" ref={buttonRef}>
            <IconButton
                pIsToopTip
                pToolTipContent="Share"
                pToolTipId="share-btn"
                pWidth={20}
                pHeight={20}
                pIcon={<Share />}
                onClick={handleShareClick}
            />
            <div className="share-menu-container" ref={menuRef}>
                <Menu isOpen={isMenuOpen}>
                    <Menu.Item onClick={handleCopyLink}>
                        Copy Public Link
                    </Menu.Item>
                    <Menu.Item onClick={handleCopyEmbedCode}>
                        Copy Embed Code
                    </Menu.Item>
                </Menu>
            </div>
        </div>
    );
};