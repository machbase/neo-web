import type { CSSProperties } from 'react';

interface GlyphImageProps {
    /** A one-colour image: its shape is used, not its colour. */
    src: string;
    size?: number;
    /** The colour the shape is painted in. Defaults to the theme's text, white on the dark screen. */
    color?: string;
    className?: string;
}

/**
 * A white-on-transparent PNG glyph painted in a theme colour.
 *
 * The chart zoom buttons' images are white, drawn for the dark panel: as an `<img>` they vanished
 * on a light theme. Used as a CSS mask the shape stays the image's and the colour is `color` —
 * `var(--neo-text-primary, #ffffff)` unless given, so the dark screen paints the same white.
 */
const GlyphImage = ({ src, size = 20, color = 'var(--neo-text-primary, #ffffff)', className }: GlyphImageProps) => {
    const sMask = `url("${src}") center / contain no-repeat`;
    const sStyle: CSSProperties = { display: 'inline-block', flexShrink: 0, width: size, height: size, backgroundColor: color, WebkitMask: sMask, mask: sMask };
    return <span aria-hidden="true" className={className} style={sStyle} />;
};

export default GlyphImage;
