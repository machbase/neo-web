import { isLightGlyph } from './pkgIconGlyph';

/** A 10×10 RGBA image: `draw(x, y)` gives the pixel, or nothing for a transparent one. */
const image = (draw: (x: number, y: number) => [number, number, number, number] | undefined) => {
    const out: number[] = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) out.push(...(draw(x, y) ?? [0, 0, 0, 0]));
    return out;
};
const stroke = (x: number, y: number) => x === 3 || y === 6;

describe('isLightGlyph', () => {
    test('a white line drawing on a transparent ground (llm-chat, blackbox) is a glyph', () => {
        expect(isLightGlyph(image((x, y) => (stroke(x, y) ? [255, 255, 255, 255] : undefined)))).toBe(true);
    });
    test('anti-aliased white edges are still white', () => {
        expect(isLightGlyph(image((x, y) => (stroke(x, y) ? [250, 250, 250, x % 2 ? 255 : 120] : undefined)))).toBe(true);
    });
    test('a colour mark is a logo', () => {
        expect(isLightGlyph(image((x, y) => (stroke(x, y) ? [230, 80, 60, 255] : undefined)))).toBe(false);
    });
    test('a filled square is a logo, white or not (opcua-client, replication)', () => {
        expect(isLightGlyph(image(() => [255, 255, 255, 255]))).toBe(false);
        expect(isLightGlyph(image((x) => (x < 7 ? [240, 240, 240, 255] : [20, 20, 20, 255])))).toBe(false);
    });
    test('a dark line drawing is left as it is (it already reads on a light page)', () => {
        expect(isLightGlyph(image((x, y) => (stroke(x, y) ? [20, 20, 20, 255] : undefined)))).toBe(false);
    });
    test('nothing drawn is no glyph', () => {
        expect(isLightGlyph(image(() => undefined))).toBe(false);
    });
});
