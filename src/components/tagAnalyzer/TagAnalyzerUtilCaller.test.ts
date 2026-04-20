import { createTagAnalyzerSeriesConfigFixture } from './TestData/PanelTestData';
import { fetchOnMinMaxTable } from './boundary/fetchOnMinMaxTable';
import { getBgnEndTimeRange } from './boundary/getBgnEndTimeRange';
import {
    fetchTagAnalyzerMinMaxTable,
    resolveTagAnalyzerTimeBoundaryRanges,
} from './TagAnalyzerUtilCaller';

jest.mock('./boundary/fetchOnMinMaxTable', () => ({
    fetchOnMinMaxTable: jest.fn(),
}));

jest.mock('./boundary/getBgnEndTimeRange', () => ({
    getBgnEndTimeRange: jest.fn(),
}));

const fetchOnMinMaxTableMock = jest.mocked(fetchOnMinMaxTable);
const getBgnEndTimeRangeMock = jest.mocked(getBgnEndTimeRange);

describe('TagAnalyzerUtilCaller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('passes sourceTagName-only series configs directly to the local time-bound utility', async () => {
        // Confirms the caller no longer rebuilds legacy tagName fields before invoking the local boundary helper.
        getBgnEndTimeRangeMock.mockResolvedValue({ end_max: 1000 } as never);

        await resolveTagAnalyzerTimeBoundaryRanges(
            [
                createTagAnalyzerSeriesConfigFixture({
                    color: '#ffffff',

                    colName: undefined,
                }),
            ],
            { bgn: 'last-1h', end: 'last-30m' },
            { bgn: '', end: '' },
        );

        expect(getBgnEndTimeRangeMock).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    sourceTagName: 'temp_sensor',
                }),
            ],
            { bgn: 'last-1h', end: 'last-30m' },
            { bgn: '', end: '' },
        );
        expect(getBgnEndTimeRangeMock.mock.calls[0][0][0]).not.toHaveProperty('tagName');
    });

    it('passes sourceTagName-only drafts directly to the local min/max seed query', async () => {
        // Confirms the caller no longer rebuilds legacy tagName fields before invoking the local repository helper.
        fetchOnMinMaxTableMock.mockResolvedValue({ data: { rows: [] } } as never);

        await fetchTagAnalyzerMinMaxTable(
            [
                createTagAnalyzerSeriesConfigFixture({
                    weight: 1,

                    colName: undefined,
                }),
            ],
            'ADMIN',
        );

        expect(fetchOnMinMaxTableMock).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    sourceTagName: 'temp_sensor',
                }),
            ],
            'ADMIN',
        );
        expect(fetchOnMinMaxTableMock.mock.calls[0][0][0]).not.toHaveProperty('tagName');
    });
});
