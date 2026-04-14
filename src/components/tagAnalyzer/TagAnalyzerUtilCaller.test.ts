import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { getBgnEndTimeRange } from '@/utils/bgnEndTimeRange';
import { createTagAnalyzerSeriesConfigFixture } from './TestData/PanelTestData';
import {
    callTagAnalyzerBgnEndTimeRange,
    callTagAnalyzerMinMaxTable,
} from './TagAnalyzerUtilCaller';

jest.mock('@/api/repository/machiot', () => ({
    fetchOnMinMaxTable: jest.fn(),
}));

jest.mock('@/utils/bgnEndTimeRange', () => ({
    getBgnEndTimeRange: jest.fn(),
}));

const fetchOnMinMaxTableMock = jest.mocked(fetchOnMinMaxTable);
const getBgnEndTimeRangeMock = jest.mocked(getBgnEndTimeRange);

describe('TagAnalyzerUtilCaller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('translates sourceTagName to tagName for the shared time-bound utility', async () => {
        // Confirms TagAnalyzer can stay sourceTagName-only while the shared helper still receives its legacy shape.
        getBgnEndTimeRangeMock.mockResolvedValue({ end_max: 1000 } as never);

        await callTagAnalyzerBgnEndTimeRange(
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
                    tagName: 'temp_sensor',
                }),
            ],
            { bgn: 'last-1h', end: 'last-30m' },
            { bgn: '', end: '' },
        );
        expect(getBgnEndTimeRangeMock.mock.calls[0][0][0]).not.toHaveProperty('sourceTagName');
    });

    it('translates sourceTagName to tagName for the shared min/max seed query', async () => {
        // Confirms the create-chart min/max seed query still receives the legacy shape at the repository boundary.
        fetchOnMinMaxTableMock.mockResolvedValue({ data: { rows: [] } } as never);

        await callTagAnalyzerMinMaxTable(
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
                    tagName: 'temp_sensor',
                }),
            ],
            'ADMIN',
        );
        expect(fetchOnMinMaxTableMock.mock.calls[0][0][0]).not.toHaveProperty(
            'sourceTagName',
        );
    });
});
