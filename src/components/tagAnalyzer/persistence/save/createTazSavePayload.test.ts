import type { PanelInfo } from '../../domain/PanelDomain';
import { createEmptyTimeBoundary } from '../../domain/time/boundary/TimeBoundaryInput';
import {
    createTimestampRangeBoundary,
    createTimestampRangeInput,
} from '../../domain/time/range/PanelRangeConfigUtils';
import type { PersistedTazBoardInfo } from '../TazPersistenceTypesV200';
import { createTazSavePayload } from './createTazSavePayload';

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
        timeRange: {
            ...createTimestampRangeInput(
                createTimestampRangeBoundary('timestamp_empty'),
                createTimestampRangeBoundary('timestamp_empty'),
            ),
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: {
                showTickline: true,
            },
            leftY: createYAxisConfig(),
            rightY: {
                ...createYAxisConfig(),
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

function createYAxisConfig(): PanelInfo['axes']['leftY'] {
    return {
        zeroBase: false,
        showTickline: true,
        valueRange: { min: 0, max: 0 },
        rawValueRange: { min: 0, max: 0 },
        upperControlLimit: {
            enabled: false,
            value: undefined,
        },
        lowerControlLimit: {
            enabled: false,
            value: undefined,
        },
    };
}

describe('createTazSavePayload', () => {
    it('saves already-runtime boards as the current TAZ version even when loaded from an old version', () => {
        const board: PersistedTazBoardInfo = {
            id: 'board-1',
            type: 'tag-analyzer',
            version: '2.0.4',
            boardTimeRange: {
                start: createEmptyTimeBoundary(),
                end: createEmptyTimeBoundary(),
            },
            panels: [createRuntimePanel()],
        };

        const payload = createTazSavePayload(board);

        expect(payload.version).toBe('2.1.0');
        expect(payload.panels).toHaveLength(1);
        expect(payload.panels[0].key).toBe('panel-1');
    });
});
