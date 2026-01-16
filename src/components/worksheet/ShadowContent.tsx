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

    // Create Shadow DOM only once
    useEffect(() => {
        if (!containerRef.current || shadowRootRef.current) return;

        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });

        // Call callback
        if (onShadowRootCreated) {
            onShadowRootCreated(shadowRootRef.current);
        }
    }, [onShadowRootCreated]);

    // Update content when html or styles change
    useEffect(() => {
        if (!shadowRootRef.current) return;

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

        // Add overflow control and image sizing
        wrapper.style.overflowX = 'hidden';
        wrapper.style.width = '100%';

        // Fix image sizes
        const images = wrapper.querySelectorAll('img');
        images.forEach((img) => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.boxSizing = 'border-box';
        });

        shadow.appendChild(wrapper);
    }, [html, styles, className]);

    return <div ref={containerRef} style={{ width: '100%', display: 'block' }} />;
};
