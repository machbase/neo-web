import { loadTazBoardInfo } from '@/components/tagAnalyzer/persistence/load/loadTazBoardInfo';
import { TAZ_FORMAT_VERSION, TazVersion } from '@/components/tagAnalyzer/persistence/TazVersion';
import { mapPanelToPersistedTaz } from '@/components/tagAnalyzer/persistence/save/mapPanelToPersistedTaz';
import type { PanelInfo } from '@/components/tagAnalyzer/domain/panel/PanelConfig';
import { isBoardSaved } from './boardSaveStatus';


beforeAll(() => {
    if (!(globalThis as any).structuredClone) {
        (globalThis as any).structuredClone = (value: unknown) =>
            JSON.parse(JSON.stringify(value));
    }
});

const loadId = 'runtime-board-id';
const loadName = 'board.taz';
const loadPath = '/work/';

function createRuntimePanel(): PanelInfo {
    return {
        key: 'panel-1',
        title: 'Runtime panel',
        query: {
            tagSet: [],
            count: -1,
            intervalType: '',
        },
        mode: {
            isRaw: false,
            isOrderBy: false,
            useNormalize: false,
        },
        time: {
            rangeInput: {
                start: '',
                end: '',
            },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: {
                showTickline: true,
            },
            leftY: createRuntimeYAxis(),
            rightY: {
                ...createRuntimeYAxis(),
                enabled: false,
            },
        },
        display: {
            chartType: 'Line',
            showLegend: true,
            showPoint: true,
            pointRadius: 0,
            fill: 0,
            stroke: 1,
            connectNulls: false,
            useZoom: true,
            pixelsPerTick: {
                raw: 0.1,
                calculated: 3,
                calculatedNavigator: 3,
            },
            mainChartSampling: {
                enabled: false,
                sampleCount: 0.01,
            },
            rawNavigatorSampling: {
                enabled: false,
                sampleCount: 0.01,
            },
        },
        highlights: [],
        annotations: [],
    };
}

function createRuntimeYAxis(): PanelInfo['axes']['leftY'] {
    return {
        zeroBase: false,
        showTickline: true,
        valueRange: { min: 0, max: 0 },
        rawValueRange: { min: 0, max: 0 },
        upperControlLimit: {
            enabled: false,
            value: 0,
        },
        lowerControlLimit: {
            enabled: false,
            value: 0,
        },
    };
}

function createPersistedPanelV200() {
    return {
        meta: {
            panelKey: 'panel-v200',
            chartTitle: 'Loaded panel',
        },
        data: {
            seriesList: [
                {
                    seriesKey: 'series-1',
                    tableName: 'TAG_TABLE',
                    sourceTagName: 'TAG_A',
                    alias: '',
                    calculationMode: 'avg',
                    color: '#367FEB',
                    useSecondaryAxis: false,
                    id: undefined,
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
                start: '',
                end: '',
            },
        },
        axes: {
            xAxis: {
                showTickLine: true,
                rawDataPixelsPerTick: 0.1,
                calculatedDataPixelsPerTick: 3,
            },
            leftYAxis: createPersistedYAxisV200(),
            rightYAxis: {
                ...createPersistedYAxisV200(),
                enabled: false,
            },
        },
        display: {
            showLegend: true,
            useZoom: true,
            chartType: 'Line',
            showPoints: true,
            pointRadius: 0,
            fill: 0,
            stroke: 1,
        },
        useNormalizedValues: false,
        highlights: [],
    };
}

function createPersistedYAxisV200() {
    return {
        zeroBase: false,
        showTickLine: true,
        valueRange: { min: 0, max: 0 },
        rawDataValueRange: { min: 0, max: 0 },
        upperControlLimit: {
            enabled: false,
            value: 0,
        },
        lowerControlLimit: {
            enabled: false,
            value: 0,
        },
    };
}

describe('loadTazBoardInfo', () => {
    it('loads current TAZ JSON as clean runtime BoardInfo', () => {
        const boardInfo = loadTazBoardInfo(
            {
                id: 'file-board-id',
                type: 'taz',
                version: TAZ_FORMAT_VERSION,
                boardTimeRange: {
                    start: '',
                    end: '',
                },
                panels: [mapPanelToPersistedTaz(createRuntimePanel())],
            },
            loadId,
            loadName,
            loadPath,
        );

        expect(boardInfo.id).toBe(loadId);
        expect(boardInfo.name).toBe(loadName);
        expect(boardInfo.path).toBe(loadPath);
        expect(boardInfo.type).toBe('taz');
        expect(boardInfo.version).toBe(TAZ_FORMAT_VERSION);
        expect(isBoardSaved(boardInfo)).toBe(true);
    });

    it('loads legacy flat TAZ JSON as runtime BoardInfo', () => {
        const boardInfo = loadTazBoardInfo(
            {
                id: 'legacy-board-id',
                type: 'taz',
                panels: [
                    {
                        tag_set: [
                            {
                                key: 'tag-1',
                                table: 'TAG_TABLE',
                                tagName: 'TAG_A',
                                calculationMode: 'avg',
                                colName: {
                                    name: 'NAME',
                                    time: 'TIME',
                                    value: 'VALUE',
                                },
                            },
                        ],
                    },
                ],
                range_bgn: '',
                range_end: '',
            },
            loadId,
            loadName,
            loadPath,
        );

        expect(boardInfo.version).toBe(TazVersion.Legacy);
        expect(boardInfo.panels).toHaveLength(1);
        expect(boardInfo.panels[0].query.tagSet[0].sourceTagName).toBe('TAG_A');
    });

    it('does not repair modern nested TagAnalyzer panels as legacy flat panels', () => {
        const boardInfo = loadTazBoardInfo(
            {
                id: 'board-1',
                type: 'taz',
                version: TazVersion.V201,
                boardTimeRange: {
                    start: '',
                    end: '',
                },
                panels: [createPersistedPanelV200()],
            },
            loadId,
            loadName,
            loadPath,
        );

        expect(boardInfo.panels[0].key).toBe('panel-v200');
        expect(boardInfo.panels[0].query.tagSet[0].sourceColumns.name).toBe('NAME');
        expect(boardInfo.panels[0].query.tagSet[0].sourceColumns.jsonKey).toBeUndefined();
    });

    it('throws for unsupported TAZ versions', () => {
        expect(() =>
            loadTazBoardInfo(
                {
                    id: 'board-1',
                    type: 'taz',
                    version: '3.0.0',
                    panels: [],
                },
                loadId,
                loadName,
                loadPath,
            ),
        ).toThrow('Unsupported TagAnalyzer .taz version:');
    });

    it('throws for invalid parsed TAZ input', () => {
        expect(() => loadTazBoardInfo(undefined, loadId, loadName, loadPath)).toThrow();
        expect(() => loadTazBoardInfo({}, loadId, loadName, loadPath)).toThrow(
            'Invalid TagAnalyzer .taz board panels structure.',
        );
    });
});
