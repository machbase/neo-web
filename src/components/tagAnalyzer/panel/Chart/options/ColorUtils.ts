export type RgbColor = {
    r: number;
    g: number;
    b: number;
};

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function parseHexColor(color: string): RgbColor | undefined {
    const sHexMatch = HEX_COLOR_PATTERN.exec(color);

    if (!sHexMatch) {
        return undefined;
    }

    const sRgbHex = sHexMatch[1];

    return {
        r: Number.parseInt(sRgbHex.slice(0, 2), 16),
        g: Number.parseInt(sRgbHex.slice(2, 4), 16),
        b: Number.parseInt(sRgbHex.slice(4, 6), 16),
    };
}
