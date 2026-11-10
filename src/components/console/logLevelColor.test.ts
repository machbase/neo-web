import { logLevelColor, logRepeatBadgeStyle } from './logLevelColor';

describe('logLevelColor', () => {
    test('a level takes its token as text, the token\'s one dark value as fallback', () => {
        expect(logLevelColor('WARN')).toBe('var(--neo-warning-text, #ff9800)');
        expect(logLevelColor('DEBUG')).toBe('var(--neo-text-primary, #f1f1f1)');
        expect(logLevelColor('ERROR')).toBe('var(--neo-error-text, #fa6464)');
    });
    test('no level, no colour', () => {
        expect(logLevelColor(undefined)).toBeUndefined();
        expect(logLevelColor('NOPE')).toBeUndefined();
    });
});

describe('logRepeatBadgeStyle', () => {
    test('the level\'s signal fills the badge and its digits are the text on fills', () => {
        expect(logRepeatBadgeStyle('ERROR')).toEqual({ background: 'var(--neo-error-main, rgb(255, 83, 83))', color: 'var(--neo-text-on-accent, #ffffff)' });
        expect(logRepeatBadgeStyle('DEBUG')).toEqual({ background: 'var(--neo-neutral-main, #6f7173)', color: 'var(--neo-text-primary, #f1f1f1)' });
    });
});
