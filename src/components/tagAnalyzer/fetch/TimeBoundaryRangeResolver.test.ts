import { createTagAnalyzerSeriesConfigFixture } from '../TestData/PanelTestData';
import { timeBoundaryRepositoryApi } from './TimeBoundaryFetchRepository';
import { resolveTimeBoundaryRanges } from './TimeBoundaryRangeResolver';
import { parseTimeRangeConfigFromBoundaryValues } from '../panel/editor/EditorTimeBoundaryParser';

describe('TimeBoundaryRangeResolver', () => {
    function createFetchedTimeBoundaryRange(
        startMin: number,
        startMax: number,
        endMin: number,
        endMax: number,
    ) {
        return {
            start: {
                min: { kind: 'absolute' as const, timestamp: startMin },
                max: { kind: 'absolute' as const, timestamp: startMax },
            },
            end: {
                min: { kind: 'absolute' as const, timestamp: endMin },
                max: { kind: 'absolute' as const, timestamp: endMax },
            },
        };
    }

    const sFetchMinMaxTableMock = jest.spyOn(timeBoundaryRepositoryApi, 'fetchMinMaxTable');
    const sFetchVirtualStatTableMock = jest.spyOn(
        timeBoundaryRepositoryApi,
        'fetchVirtualStatTable',
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads min-max bounds when both board and panel ranges are empty', async () => {
        sFetchMinMaxTableMock.mockResolvedValue(
            createFetchedTimeBoundaryRange(1, 1, 4, 4),
        );

        const sResolvedRangePair = await resolveTimeBoundaryRanges(
            [createTagAnalyzerSeriesConfigFixture(undefined)],
            parseTimeRangeConfigFromBoundaryValues('', ''),
            parseTimeRangeConfigFromBoundaryValues('', ''),
        );

        expect(sResolvedRangePair).toEqual({
            start: {
                min: { kind: 'absolute', timestamp: 1 },
                max: { kind: 'absolute', timestamp: 1 },
            },
            end: {
                min: { kind: 'absolute', timestamp: 4 },
                max: { kind: 'absolute', timestamp: 4 },
            },
        });
        expect(sFetchMinMaxTableMock).toHaveBeenCalledTimes(1);
        expect(sFetchVirtualStatTableMock).not.toHaveBeenCalled();
    });

    it('reuses numeric board bounds without loading repository min-max data', async () => {
        const sResolvedRangePair = await resolveTimeBoundaryRanges(
            [createTagAnalyzerSeriesConfigFixture(undefined)],
            parseTimeRangeConfigFromBoundaryValues(100, 400),
            parseTimeRangeConfigFromBoundaryValues('', ''),
        );

        expect(sResolvedRangePair).toEqual({
            start: {
                min: { kind: 'absolute', timestamp: 100 },
                max: { kind: 'absolute', timestamp: 100 },
            },
            end: {
                min: { kind: 'absolute', timestamp: 400 },
                max: { kind: 'absolute', timestamp: 400 },
            },
        });
        expect(sFetchMinMaxTableMock).not.toHaveBeenCalled();
        expect(sFetchVirtualStatTableMock).not.toHaveBeenCalled();
    });

    it('loads virtual-stat bounds for last-based ranges before falling back to min-max', async () => {
        sFetchVirtualStatTableMock.mockResolvedValue(
            createFetchedTimeBoundaryRange(100, 200, 800, 900),
        );

        const sResolvedRangePair = await resolveTimeBoundaryRanges(
            [
                createTagAnalyzerSeriesConfigFixture({
                    table: 'TABLE_A',
                    sourceTagName: 'temp_sensor',
                }),
                createTagAnalyzerSeriesConfigFixture({
                    table: 'TABLE_A',
                    sourceTagName: 'pressure_sensor',
                }),
                createTagAnalyzerSeriesConfigFixture({
                    table: 'TABLE_B',
                    sourceTagName: 'humidity_sensor',
                }),
            ],
            parseTimeRangeConfigFromBoundaryValues('', ''),
            parseTimeRangeConfigFromBoundaryValues('last-30m', 'last'),
        );

        expect(sResolvedRangePair).toEqual({
            start: {
                min: { kind: 'absolute', timestamp: 100 },
                max: { kind: 'absolute', timestamp: 200 },
            },
            end: {
                min: { kind: 'absolute', timestamp: 800 },
                max: { kind: 'absolute', timestamp: 900 },
            },
        });
        expect(sFetchVirtualStatTableMock).toHaveBeenCalledWith(
            'TABLE_A',
            ['temp_sensor', 'pressure_sensor'],
            expect.objectContaining({
                table: 'TABLE_A',
                sourceTagName: 'temp_sensor',
            }),
        );
        expect(sFetchMinMaxTableMock).not.toHaveBeenCalled();
    });
});

