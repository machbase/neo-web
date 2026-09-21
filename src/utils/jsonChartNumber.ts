/** Match finite values accepted by Machbase TO_NUMBER_SAFE for JSON text. */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const HEX = /^([+-]?)0[xX]((?:[0-9a-fA-F]+(?:\.[0-9a-fA-F]*)?|\.[0-9a-fA-F]+))(?:[pP]([+-]?\d+))?$/;

export const jsonChartNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (DECIMAL.test(text)) {
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : null;
    }
    const hex = HEX.exec(text);
    if (!hex) return null;
    const [whole = '', fraction = ''] = hex[2].split('.');
    let parsed = whole ? parseInt(whole, 16) : 0;
    for (let index = 0; index < fraction.length; index += 1) parsed += parseInt(fraction[index], 16) / 16 ** (index + 1);
    parsed *= 2 ** Number(hex[3] || 0);
    if (hex[1] === '-') parsed = -parsed;
    return Number.isFinite(parsed) ? parsed : null;
};
