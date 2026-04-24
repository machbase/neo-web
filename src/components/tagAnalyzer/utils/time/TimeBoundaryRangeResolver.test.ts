import { createTagAnalyzerSeriesConfigFixture } from '../../TestData/PanelTestData';
import { timeBoundaryRepositoryApi } from '../fetch/TimeBoundaryFetchRepository';
import { resolveTimeBoundaryRanges } from './TimeBoundaryRangeResolver';

describe('TimeBoundaryRangeResolver', () => {
    const sFetchMinMaxTableMock = jest.spyOn(timeBoundaryRepositoryApi, 'fetchMinMaxTable');
    const sFetchVirtualStatTableMock = jest.spyOn(
        timeBoundaryRepositoryApi,
        'fetchVirtualStatTable',
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads min-max bounds when both board and panel ranges are empty', async () => {
        sFetchMinMaxTableMock.mockResolvedValue({
            data: {
                rows: [[1_000_000, 4_000_000]],
            },
        });

        const sResolvedRangePair = await resolveTimeBoundaryRanges(
            [
                createTagAnalyzerSeriesConfigFixture(undefined),
            ],
            {
                bgn: '',
                end: '',
            },
            {
                bgn: '',
                end: '',
            },
        );

        expect(sResolvedRangePair).toEqual({
            start: {
                min: 1,
                max: 1,
            },
            end: {
                min: 4,
                max: 4,
            },
        });
        expect(sFetchMinMaxTableMock).toHaveBeenCalledTimes(1);
        expect(sFetchVirtualStatTableMock).not.toHaveBeenCalled();
    });

    it('reuses numeric board bounds without loading repository min-max data', async () => {
        const sResolvedRangePair = await resolveTimeBoundaryRanges(
            [
                createTagAnalyzerSeriesConfigFixture(undefined),
            ],
            {
                bgn: 100,
                end: 400,
            },
            {
                bgn: '',
                end: '',
            },
        );

        expect(sResolvedRangePair).toEqual({
            start: {
                min: 100,
                max: 100,
            },
            end: {
                min: 400,
                max: 400,
            },
        });
        expect(sFetchMinMaxTableMock).not.toHaveBeenCalled();
        expect(sFetchVirtualStatTableMock).not.toHaveBeenCalled();
    });
});
