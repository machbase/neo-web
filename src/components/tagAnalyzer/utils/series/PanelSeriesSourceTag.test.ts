import {
    getSourceTagName,
    normalizeSourceTagNames,
    withNormalizedSourceTagName,
} from './PanelSeriesSourceTag';

describe('PanelSeriesSourceTag', () => {
    it('reads sourceTagName directly when it already exists', () => {
        expect(
            getSourceTagName({
                sourceTagName: 'temp_sensor',
                tagName: 'legacy_sensor',
            }),
        ).toBe('temp_sensor');
    });

    it('falls back to tagName for legacy items', () => {
        expect(
            withNormalizedSourceTagName({
                key: 'tag-1',
                table: 'TABLE_A',
                tagName: 'legacy_sensor',
            }),
        ).toEqual({
            key: 'tag-1',
            table: 'TABLE_A',
            sourceTagName: 'legacy_sensor',
        });
    });

    it('normalizes source tag names across a list', () => {
        expect(
            normalizeSourceTagNames([
                {
                    key: 'tag-1',
                    table: 'TABLE_A',
                    tagName: 'legacy_sensor',
                },
            ]),
        ).toEqual([
            {
                key: 'tag-1',
                table: 'TABLE_A',
                sourceTagName: 'legacy_sensor',
            },
        ]);
    });
});
