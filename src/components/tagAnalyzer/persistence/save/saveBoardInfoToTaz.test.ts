import type { BoardInfo } from '../../domain/BoardDomain';
import type { PanelInfo } from '../../domain/panel/PanelConfig';
import { TazVersion } from '../TazVersion';
import { saveBoardInfoToTaz } from './saveBoardInfoToTaz';
import { saveTazFile } from './saveTazFile';

jest.mock('./saveTazFile', () => ({
    saveTazFile: jest.fn(),
}));

const saveTazFileMock = jest.mocked(saveTazFile);

function createRuntimePanel(): PanelInfo {
    return {
        key: 'panel-1',
        title: 'Runtime panel',
        query: {
            tagSet: [],
            count: 0,
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
        valueRange: { min: undefined, max: undefined },
        rawValueRange: { min: undefined, max: undefined },
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

function createRuntimeBoard(): BoardInfo {
    return {
        id: 'board-1',
        type: 'taz',
        name: 'board.taz',
        path: '/charts/',
        code: '',
        savedCode: false,
        version: TazVersion.V204,
        boardTimeRange: {
            start: '',
            end: '',
        },
        panels: [createRuntimePanel()],
    };
}

describe('saveBoardInfoToTaz', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('converts BoardInfo to the current TAZ payload and saves it', async () => {
        saveTazFileMock.mockResolvedValue({ success: true });

        const didSave = await saveBoardInfoToTaz(createRuntimeBoard());

        expect(didSave).toBe(true);
        expect(saveTazFileMock).toHaveBeenCalledWith({
            directoryPath: '/charts/',
            fileName: 'board.taz',
            payload: expect.objectContaining({
                id: 'board-1',
                type: 'taz',
                version: TazVersion.V210,
                panels: [
                    expect.objectContaining({
                        key: 'panel-1',
                        title: 'Runtime panel',
                    }),
                ],
            }),
        });
    });

    it('returns false when the file save fails', async () => {
        saveTazFileMock.mockResolvedValue({ success: false });

        await expect(saveBoardInfoToTaz(createRuntimeBoard()))
            .resolves.toBe(false);
    });

    it('returns false when the file save throws', async () => {
        saveTazFileMock.mockRejectedValue(new Error('save failed'));

        await expect(saveBoardInfoToTaz(createRuntimeBoard()))
            .resolves.toBe(false);
    });
});