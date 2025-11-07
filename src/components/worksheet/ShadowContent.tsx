import { useEffect, useRef } from 'react';

interface ShadowContentProps {
    html: string;
    styles?: string;
    className?: string;
    onShadowRootCreated?: (shadowRoot: ShadowRoot) => void;
}

export const ShadowContent = ({ html, styles = '', className = '', onShadowRootCreated }: ShadowContentProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const shadowRootRef = useRef<ShadowRoot | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Create Shadow DOM if not exists
        if (!shadowRootRef.current) {
            shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });

            // Call callback
            if (onShadowRootCreated) {
                onShadowRootCreated(shadowRootRef.current);
            }
        }

        const shadow = shadowRootRef.current;

        // Clear existing content
        while (shadow.firstChild) {
            shadow.removeChild(shadow.firstChild);
        }

        // Add styles
        if (styles) {
            const styleElement = document.createElement('style');
            styleElement.textContent = styles;
            shadow.appendChild(styleElement);
        }

        // Add HTML content
        const wrapper = document.createElement('div');
        if (className) {
            wrapper.className = className;
        }
        wrapper.innerHTML = html;
        shadow.appendChild(wrapper);

    }, [html, styles, className, onShadowRootCreated]);

    return <div ref={containerRef} style={{ width: '100%', display: 'block' }} />;
};
