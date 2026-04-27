import {
    normalizeLegacySeriesConfigs,
    toLegacyTagNameList,
} from './LegacySeriesPersistenceAdapter';
import type { LegacyCompatibleSeriesConfig } from './LegacySeriesTypes';

describe('LegacySeriesPersistenceAdapter', () => {
    it('defaults a missing legacy useRollupTable flag to false', () => {
        const legacySeriesConfig: LegacyCompatibleSeriesConfig = {
            key: 'tag-1',
            table: 'TABLE_A',
            sourceTagName: 'temp_sensor',
            alias: 'Temp Sensor',
            calculationMode: 'Raw',
            color: '#ff0000',
            use_y2: 'N',
            id: undefined,
            colName: undefined,
        };

        expect(normalizeLegacySeriesConfigs([legacySeriesConfig])).toEqual([
            {
                key: 'tag-1',
                table: 'TABLE_A',
                sourceTagName: 'temp_sensor',
                alias: 'Temp Sensor',
                calculationMode: 'Raw',
                color: '#ff0000',
                useSecondaryAxis: false,
                id: undefined,
                useRollupTable: false,
                sourceColumns: {
                    name: 'NAME',
                    time: 'TIME',
                    value: 'VALUE',
                },
                annotations: [],
            },
        ]);
    });

    it('normalizes legacy colName columns into runtime sourceColumns', () => {
        const legacySeriesConfig: LegacyCompatibleSeriesConfig = {
            key: 'tag-1',
            table: 'TABLE_A',
            sourceTagName: 'temp_sensor',
            alias: 'Temp Sensor',
            calculationMode: 'Raw',
            color: '#ff0000',
            use_y2: 'N',
            id: undefined,
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'VALUE',
            },
        };

        const seriesConfigs = normalizeLegacySeriesConfigs([legacySeriesConfig]);

        expect(seriesConfigs[0]).toEqual(
            expect.objectContaining({
                sourceColumns: {
                    name: 'NAME',
                    time: 'TIME',
                    value: 'VALUE',
                },
            }),
        );
        expect(seriesConfigs[0]).not.toHaveProperty('colName');
    });

    it('recreates tagName only when leaving the normalized boundary', () => {
        const legacyItems = toLegacyTagNameList([
            {
                key: 'tag-1',
                table: 'TABLE_A',
                sourceTagName: 'temp_sensor',
            },
        ]);

        expect(legacyItems).toEqual([
            {
                key: 'tag-1',
                table: 'TABLE_A',
                tagName: 'temp_sensor',
            },
        ]);
        expect(legacyItems[0]).not.toHaveProperty('sourceTagName');
    });
});
