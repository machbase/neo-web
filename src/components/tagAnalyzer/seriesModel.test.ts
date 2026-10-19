import {
    createPanelSeriesDefinition,
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    PanelSeriesCalculationMode,
} from './seriesModel';

const INPUT = {
    key: 'series-a',
    table: 'MACHBASEDB.SYS.TAG',
    tagName: 'sensor',
    calculationMode: PanelSeriesCalculationMode.Average,
    columns: DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
};

describe('createPanelSeriesDefinition', () => {
    it.each([undefined, false, true])('uses the explicitly supplied rollup flag %s, defaulting to false', (useRollupTable) => {
        const series = createPanelSeriesDefinition({ ...INPUT, useRollupTable });

        expect(series.useRollupTable).toBe(useRollupTable ?? false);
        expect(series.sourceTagName).toBe('sensor');
        expect(series.calculationMode).toBe(PanelSeriesCalculationMode.Average);
        expect(series.useSecondaryAxis).toBe(false);
    });

    it('clones source columns and derives a default alias for a blank name', () => {
        const columns = { ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS, jsonKey: '$.temperature' };
        const series = createPanelSeriesDefinition({ ...INPUT, columns, alias: '   ' });

        expect(series.alias).toBe('sensor / VALUE -> $.temperature (MACHBASEDB.SYS.TAG)');
        expect(series.sourceColumns).toEqual(columns);
        expect(series.sourceColumns).not.toBe(columns);
        series.sourceColumns.value = 'OTHER_VALUE';
        expect(columns.value).toBe('VALUE');
    });

    it('preserves a supplied nonblank alias exactly', () => {
        expect(createPanelSeriesDefinition({ ...INPUT, alias: '  Custom label  ' }).alias).toBe('  Custom label  ');
        expect(createPanelSeriesDefinition(INPUT).alias).toBe('sensor / VALUE (MACHBASEDB.SYS.TAG)');
    });

    it('keeps a non-plain table name raw for the SQL builders to quote', () => {
        expect(createPanelSeriesDefinition({ ...INPUT, table: 'MACHBASEDB.SYS.Q-1545' }).table)
            .toBe('MACHBASEDB.SYS.Q-1545');
    });

    it('rejects a table name with an empty part', () => {
        expect(() => createPanelSeriesDefinition({ ...INPUT, table: 'SYS..TAG' }))
            .toThrow('SQL table name is missing a name: SYS..TAG');
    });

    it.each(['name', 'time', 'value'] as const)('rejects an empty %s column', (column) => {
        expect(() => createPanelSeriesDefinition({
            ...INPUT, columns: { ...INPUT.columns, [column]: '' },
        })).toThrow('is missing a name');
    });
});
