import { CheckDataCompatibility } from './CheckDataCompatibility';

describe('CheckDataCompatibility', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    it('does not repair modern nested Tag Analyzer panels as legacy flat panels', () => {
        const sPanel = {
            meta: {
                panelKey: 'panel-1',
                chartTitle: 'New chart',
            },
            data: {
                seriesList: [
                    {
                        seriesKey: 'series-1',
                        tableName: 'TAG',
                        sourceTagName: 'TAG-1',
                        alias: '',
                        calculationMode: 'avg',
                        color: '#367FEB',
                        useSecondaryAxis: false,
                        useRollupTable: false,
                        sourceColumns: {
                            nameColumn: 'NAME',
                            timeColumn: 'TIME',
                            valueColumn: 'VALUE',
                        },
                    },
                ],
                rowLimit: -1,
                intervalType: '',
            },
            toolbar: {
                isRaw: false,
            },
            time: {
                rangeConfig: {
                    start: {
                        kind: 'relative',
                        anchor: 'now',
                        amount: 1,
                        unit: 'hour',
                    },
                    end: {
                        kind: 'relative',
                        anchor: 'now',
                    },
                },
            },
            axes: {
                xAxis: {},
                sampling: {},
                leftYAxis: {},
                rightYAxis: {},
            },
            display: {
                showLegend: true,
                useZoom: true,
                chartType: 'Line',
                showPoints: false,
                pointRadius: 0,
                fill: 0.15,
                stroke: 1.5,
            },
            useNormalizedValues: false,
            highlights: [],
        };

        const sResult = CheckDataCompatibility(
            JSON.stringify({
                id: 'board-1',
                type: 'taz',
                version: '2.0.1',
                boardTimeRange: sPanel.time.rangeConfig,
                panels: [sPanel],
            }),
            'taz',
        );

        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('[TagAnalyzer]'),
            expect.anything(),
        );
        expect(sResult.panels[0]).toHaveProperty('meta.panelKey', 'panel-1');
        expect(sResult.panels[0]).not.toHaveProperty('index_key');
        expect(sResult.panels[0]).not.toHaveProperty('tag_set');
    });
});
