import type { PersistedPanelInfoV210 } from '../TazPersistenceTypesV210';
import { parseLoadedPanelTazVer210 } from './parseLoadedPanelTazVer210';

function createPersistedPanelWithoutQueryCount(): PersistedPanelInfoV210 {
    const yAxis = {
        zeroBase: false,
        showTickline: true,
        valueRange: { min: 0, max: 0 },
        rawValueRange: { min: 0, max: 0 },
        upperControlLimit: { enabled: false, value: 0 },
        lowerControlLimit: { enabled: false, value: 0 },
    };

    return {
        key: 'panel-1',
        title: 'Loaded panel',
        query: {
            tagSet: [],
            intervalType: '',
        },
        mode: {
            isRaw: false,
            isOrderBy: false,
            useNormalize: false,
        },
        timeRange: {
            start: { kind: 'timestamp_empty', value: 0 },
            end: { kind: 'timestamp_empty', value: 0 },
            useLastViewedRange: false,
            lastViewedRange: undefined,
        },
        axes: {
            x: {
                showTickline: true,
            },
            leftY: yAxis,
            rightY: {
                ...yAxis,
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
                sampleCount: 0,
            },
        },
        highlights: [],
        annotations: [],
    } as unknown as PersistedPanelInfoV210;
}

describe('parseLoadedPanelTazVer210', () => {
    it('normalizes missing query count to zero', () => {
        const parsedPanel = parseLoadedPanelTazVer210(
            createPersistedPanelWithoutQueryCount(),
        );

        expect(parsedPanel.query.count).toBe(0);
    });
});