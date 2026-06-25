import { normalizePersistedPanelRangeInput } from './normalizePersistedPanelRangeInput';

describe('normalizePersistedPanelRangeInput', () => {
    it('passes through new-format datetime expression strings', () => {
        expect(
            normalizePersistedPanelRangeInput(
                { start: 'now-1h', end: 'now' },
                false,
            ),
        ).toEqual({ start: 'now-1h', end: 'now' });
    });

    it('canonicalizes new-format numeric expression strings', () => {
        expect(
            normalizePersistedPanelRangeInput(
                { start: 'first-10', end: 'LAST' },
                true,
            ),
        ).toEqual({ start: 'first-10', end: 'last' });
    });

    it('converts legacy structured timestamp boundaries to expression strings', () => {
        expect(
            normalizePersistedPanelRangeInput(
                {
                    start: { kind: 'timestamp_now', value: -3_600_000 },
                    end: { kind: 'timestamp_data_end', value: 0 },
                },
                false,
            ),
        ).toEqual({ start: 'now-3600000ms', end: 'last' });
    });

    it('converts legacy structured numeric boundaries to expression strings', () => {
        expect(
            normalizePersistedPanelRangeInput(
                {
                    start: { kind: 'numeric_data_start', value: 10 },
                    end: { kind: 'numeric_value', value: 50 },
                },
                true,
            ),
        ).toEqual({ start: 'first-10', end: '50' });
    });

    it('converts legacy numeric_data_end (negative offset) to "last-N"', () => {
        expect(
            normalizePersistedPanelRangeInput(
                {
                    start: { kind: 'numeric_data_end', value: -5 },
                    end: { kind: 'numeric_data_end', value: 0 },
                },
                true,
            ),
        ).toEqual({ start: 'last-5', end: 'last' });
    });

    it('converts legacy direct numbers per axis kind', () => {
        expect(
            normalizePersistedPanelRangeInput({ start: 5, end: 10 }, true),
        ).toEqual({ start: '5', end: '10' });
    });

    it('returns undefined when the config is not an object', () => {
        expect(normalizePersistedPanelRangeInput(null, false)).toBeUndefined();
        expect(normalizePersistedPanelRangeInput('now', false)).toBeUndefined();
    });
});
