import request from '../core';
import { fetchCalculationData, fetchRawData } from './machiot';

jest.mock('../core', () => jest.fn());

const mockedRequest = request as unknown as jest.Mock;

describe('public fetchCalculationData JSON value SQL', () => {
    beforeEach(() => {
        mockedRequest.mockReset();
        mockedRequest.mockResolvedValue({
            status: 200,
            data: '',
        });
    });

    test('non-rollup avg calculation converts JSON value before aggregation', async () => {
        await fetchCalculationData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1745910581000,
            End: 1745914181000,
            CalculationMode: 'avg',
            Count: 100,
            IntervalType: 'min',
            IntervalValue: 7,
            Rollup: false,
            RollupList: {},
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("sum(TO_NUMBER_SAFE(PAYLOAD->'$.metrics.temperature'))");
        expect(data).not.toContain('sum(PAYLOAD)');
        expect(data).not.toContain("sum(PAYLOAD->'$.metrics.temperature')");
    });

    test('raw data converts JSON value before selecting value column', async () => {
        await fetchRawData({
            Table: 'sys.EXAMPLE',
            TagNames: 'wave.sin',
            Start: 1745910581000,
            End: 1745914181000,
            Direction: 2,
            Count: 100,
            sampleValue: undefined,
            UseSampling: false,
            colName: {
                name: 'NAME',
                time: 'TIME',
                value: 'PAYLOAD',
                jsonKey: 'metrics.temperature',
            },
        });

        const data = mockedRequest.mock.calls[0][0].data;

        expect(data).toContain("TO_NUMBER_SAFE(PAYLOAD->'$.metrics.temperature') as value");
        expect(data).not.toContain('PAYLOAD as value');
    });
});
