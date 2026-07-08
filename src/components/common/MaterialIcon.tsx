import type { CSSProperties } from 'react';

interface MaterialIconProps {
    name: string;
    size?: number;
    color?: string;
    className?: string;
    style?: CSSProperties;
}

/**
 * Self-contained Material Symbols (Outlined) icon.
 *
 * The Material Symbols font is loaded globally in index.html, but the
 * `.material-symbols-outlined` styling is scoped to `.neo-data-viewer`
 * (DataViewerPage.scss). This component inlines the required font styling so
 * the glyph renders correctly anywhere in the app (e.g. the DB Explorer tree
 * button and the board tab strip), not only inside the Data Viewer page.
 */
const MaterialIcon = ({ name, size = 16, color, className = '', style }: MaterialIconProps) => (
    <span
        className={`material-symbols-outlined ${className}`.trim()}
        aria-hidden="true"
        style={{
            fontFamily: "'Material Symbols Outlined'",
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontSize: `${size}px`,
            lineHeight: 1,
            letterSpacing: 'normal',
            textTransform: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            direction: 'ltr',
            fontFeatureSettings: "'liga'",
            fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
            // The glyph is a <span>; it must not inherit stray tab/button span styles.
            // - cursor:pointer — a bare <span> won't show the button's pointer, so set it explicitly (used only in clickable icons).
            // - padding:0 — neutralizes rules like the tab strip's `span { padding-left: 8px }`.
            padding: 0,
            cursor: 'pointer',
            color,
            ...style,
        }}
    >
        {name}
    </span>
);

export default MaterialIcon;
