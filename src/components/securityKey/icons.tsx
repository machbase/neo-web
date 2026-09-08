// Security-key glyph family.
//
// Deliberately NOT a key glyph: certificates and tokens are both "keys" colloquially, so a key icon
// reads as the same thing twice. Instead each credential gets the metaphor of its own artifact —
// a sealed document, and a minted coin — with a shield standing for the section as a whole.
// All three are stroke-only on `currentColor` so they inherit Side/GNB/tab colors.
//
// The fills are set as INLINE STYLES, not `fill="none"` attributes, on purpose: the GNB's selected
// state declares `svg path { fill: ... }`, and a CSS declaration always beats a presentation
// attribute — which turned the outline into a solid silhouette the moment the rail item was active.
// Inline style outranks that rule, so these stay outlines in every state.

interface GlyphProps {
    /**
     * Defaults to `1em` so an unsized glyph scales with its container's font-size, the way the
     * react-icons used beside it do — the GNB rail renders those at 22px, and a hardcoded 16 here
     * made the shield visibly smaller than every one of its neighbours.
     */
    size?: number | string;
    className?: string;
    style?: React.CSSProperties;
}

/** outline elements must defend their fill against the GNB's `svg path { fill }` rule */
const outline = { fill: 'none' } as const;
/** the only intentionally solid mark in the family — the token's struck centre */
const solid = { fill: 'currentColor' } as const;

const base = (size: number | string) => ({
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false as const,
});

/** Certificate glyph — document with a certification seal at its lower-right. */
export const CertificateIcon = ({ size = '1em', className, style }: GlyphProps) => (
    <svg {...base(size)} className={className} style={style}>
        <path style={outline} d="M3 1.9h6.1L12.4 5.2v4.3" />
        <path style={outline} d="M12.4 12.6v1.5H3V1.9" />
        <path style={outline} d="M9 1.9v3.4h3.4" />
        <path style={outline} d="M5.3 5.4h2.1M5.3 7.7h3.1" />
        <circle style={outline} cx="11" cy="11.2" r="2.15" />
        <path style={outline} d="m9.9 12.95-.35 2 1.45-.8 1.45.8-.35-2" />
    </svg>
);

/** Token glyph — coin: double rim plus a struck center point. */
export const TokenIcon = ({ size = '1em', className, style }: GlyphProps) => (
    <svg {...base(size)} className={className} style={style}>
        <circle style={outline} cx="8" cy="8" r="6.2" />
        <circle style={outline} cx="8" cy="8" r="3.7" />
        <circle style={solid} cx="8" cy="8" r="1" stroke="none" />
    </svg>
);
