import { validateExtensionSettings } from './settings';

describe('extension panel settings', () => {
    test('reports a nested Date under its top-level key before running package validators', () => {
        const start = new Date('2026-11-10T00:00:00Z');
        const draft = { schedule: { start }, text: 'draft' };
        const text = jest.fn();
        const result = validateExtensionSettings(draft, { text });
        expect(result.settingErrors).toEqual({ schedule: 'settings["schedule"]["start"] must be a date string.' });
        expect(text).not.toHaveBeenCalled();
        expect(draft.schedule.start).toBe(start);
    });

    test('keeps literal key names and rejects array holes, circular values and lossy numbers', () => {
        const circular: any = {};
        circular.self = circular;
        const sparse = Array(1);
        expect(Object.keys(validateExtensionSettings({ 'a.b': NaN, sparse, circular, zero: -0 }).settingErrors)).toEqual([
            'a.b', 'sparse', 'circular', 'zero',
        ]);
    });

    test('passes the whole draft to field validators and keeps a valid snapshot independent of the draft', () => {
        const draft = { schedule: { start: '2026-11-10' }, end: '2026-11-11' };
        const end = jest.fn(() => 'Choose another date.');
        expect(validateExtensionSettings(draft, { end }).settingErrors).toEqual({ end: 'Choose another date.' });
        expect(end).toHaveBeenCalledWith(draft.end, draft);
        const result = validateExtensionSettings(draft);
        expect(result.settings).toEqual(draft);
        draft.schedule.start = 'changed';
        expect(result.settings?.schedule).toEqual({ start: '2026-11-10' });
    });
});
