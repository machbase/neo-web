// A package icon that is a white line drawing on a transparent ground — drawn for the dark screen —
// vanishes on a light theme as an <img>. Such an icon is painted as a shape instead (a CSS mask, as
// GlyphImage does), in the theme's text colour: white on the dark screen, as before. A logo (colour,
// or filling its square) stays the image it is.
//
// Telling the two apart means reading the pixels, which takes a CORS-enabled copy of the image: the
// installed copy is same-origin and the hub's raw.githubusercontent answers with
// `Access-Control-Allow-Origin: *`. Where that copy cannot be read the icon stays an <img> — never
// worse than before. The <img> on the card is not touched: it loads as it always did.

const SAMPLE = 48;

/**
 * Whether RGBA pixels are a light glyph: mostly transparent ground, and what is drawn is near-white
 * and colourless (anti-aliased edges included — they are white at a partial alpha).
 */
export function isLightGlyph(aRgba: ArrayLike<number>): boolean {
    let sDrawn = 0;
    let sWhite = 0;
    let sColourful = 0;
    const sPixels = aRgba.length / 4;
    for (let i = 0; i < aRgba.length; i += 4) {
        if (aRgba[i + 3] <= 40) continue;
        sDrawn++;
        const sMax = Math.max(aRgba[i], aRgba[i + 1], aRgba[i + 2]);
        const sMin = Math.min(aRgba[i], aRgba[i + 1], aRgba[i + 2]);
        if (sMax - sMin > 40) sColourful++;
        if (sMin > 200) sWhite++;
    }
    if (!sDrawn || sDrawn / sPixels >= 0.6) return false; // nothing drawn, or a filled square: a logo
    return sColourful / sDrawn < 0.05 && sWhite / sDrawn > 0.85;
}

const sVerdicts = new Map<string, Promise<boolean>>();

/** Whether the icon at `aSrc` is a light glyph; false when it cannot be read. One look per address. */
export function lightGlyphOf(aSrc: string): Promise<boolean> {
    let sVerdict = sVerdicts.get(aSrc);
    if (!sVerdict) {
        sVerdict = new Promise<boolean>((resolve) => {
            const sImage = new Image();
            sImage.crossOrigin = 'anonymous';
            sImage.onload = () => {
                try {
                    const sCanvas = document.createElement('canvas');
                    sCanvas.width = SAMPLE;
                    sCanvas.height = SAMPLE;
                    const sContext = sCanvas.getContext('2d');
                    if (!sContext) return resolve(false);
                    sContext.drawImage(sImage, 0, 0, SAMPLE, SAMPLE);
                    resolve(isLightGlyph(sContext.getImageData(0, 0, SAMPLE, SAMPLE).data));
                } catch {
                    resolve(false); // a canvas tainted by an image without CORS
                }
            };
            sImage.onerror = () => resolve(false);
            sImage.src = aSrc;
        });
        sVerdicts.set(aSrc, sVerdict);
    }
    return sVerdict;
}
