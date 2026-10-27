// A CSS colour value — a `var(--neo-…, …)` included — as the hex the browser resolves it to.
//
// For the places that take colours as data rather than as CSS: Monaco's `defineTheme` accepts
// `#rrggbb[aa]` and nothing else, so `var(--neo-bg-secondary, #252525)` has to become what the
// current theme makes of it.

const toHex = (aChannel: number) => Math.max(0, Math.min(255, Math.round(aChannel))).toString(16).padStart(2, '0');

/** `rgb(1, 2, 3)` / `rgba(1, 2, 3, 0.5)` / `rgb(1 2 3 / 50%)` → `#010203[80]`; anything else → undefined. */
export const rgbToHex = (aRgb: string): string | undefined => {
    const sMatch = /^rgba?\(([^)]*)\)$/i.exec(aRgb.trim());
    if (!sMatch) return undefined;
    const sParts = sMatch[1].split(/[\s,/]+/).filter(Boolean);
    if (sParts.length < 3) return undefined;
    const sRgb = sParts.slice(0, 3).map(Number);
    if (sRgb.some(Number.isNaN)) return undefined;
    const sAlphaText = sParts[3];
    const sAlpha = sAlphaText === undefined ? 1 : sAlphaText.endsWith('%') ? parseFloat(sAlphaText) / 100 : parseFloat(sAlphaText);
    return `#${sRgb.map(toHex).join('')}${sAlpha < 1 ? toHex(sAlpha * 255) : ''}`;
};

/**
 * `aValue` resolved against the document's current variables, as hex. `aFallback` when the
 * browser cannot resolve it (no DOM, an invalid value).
 */
export const resolveCssColor = (aValue: string, aFallback: string): string => {
    if (typeof document === 'undefined' || !document.body) return aFallback;
    const sProbe = document.createElement('span');
    sProbe.style.display = 'none';
    sProbe.style.color = aValue;
    if (!sProbe.style.color) return aFallback;
    document.body.appendChild(sProbe);
    const sResolved = getComputedStyle(sProbe).color;
    sProbe.remove();
    return rgbToHex(sResolved) ?? aFallback;
};
