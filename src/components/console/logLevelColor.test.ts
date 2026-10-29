import { logLevelColor, logRepeatBadgeStyle } from './logLevelColor';

describe('logLevelColor', () => {
    test('a level takes its theme token, the dark console colour as fallback', () => {
        expect(logLevelColor('WARN')).toBe('var(--neo-warning-main, #FFCC00)');
        expect(logLevelColor('DEBUG')).toBe('var(--neo-text-primary, #F8F8F8)');
        expect(logLevelColor('ERROR')).toBe('var(--neo-error-main, #CC3300)');
    });
    test('no level, no colour', () => {
        expect(logLevelColor(undefined)).toBeUndefined();
        expect(logLevelColor('NOPE')).toBeUndefined();
    });
});

describe('logRepeatBadgeStyle', () => {
    test('the level colour fills the badge and its digits are accent ink, the row colour with no theme', () => {
        expect(logRepeatBadgeStyle('ERROR', false)).toEqual({ background: 'var(--neo-error-main, #CC3300)', color: 'var(--neo-text-on-accent, #d1d1d1)' });
        expect(logRepeatBadgeStyle('DEBUG', true)).toEqual({ background: 'var(--neo-text-primary, #F8F8F8)', color: 'var(--neo-text-on-accent, #f4f4f4)' });
    });
});
