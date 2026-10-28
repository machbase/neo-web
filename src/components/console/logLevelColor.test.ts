import { logLevelColor } from './logLevelColor';

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
