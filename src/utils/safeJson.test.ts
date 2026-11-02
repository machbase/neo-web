import { stringifyJsonSafely } from './safeJson';

// Deep enough to overflow the call stack when indenting, in every engine we measured.
const DEPTH = 8000;
const deepArray = () => JSON.parse('['.repeat(DEPTH) + ']'.repeat(DEPTH));

describe('stringifyJsonSafely', () => {
    it('prints what JSON.stringify prints', () => {
        const sValue = { a: [1, 'x', null], b: { c: true } };
        expect(stringifyJsonSafely(sValue)).toBe(JSON.stringify(sValue));
        expect(stringifyJsonSafely(sValue, 4)).toBe(JSON.stringify(sValue, null, 4));
    });

    it('answers undefined for a document nested too deeply to print', () => {
        expect(() => JSON.stringify(deepArray(), null, 4)).toThrow();
        expect(stringifyJsonSafely(deepArray(), 4)).toBeUndefined();
    });
});
