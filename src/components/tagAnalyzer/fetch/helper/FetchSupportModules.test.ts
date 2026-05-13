import { Toast } from '@/design-system/components';
import { addAdminSchemaIfNeeded } from './TableNameSchema';
import {
    calculateSampleCount,
} from './PanelChartDatasetFetcher';
import { showRequestError } from './FetchRequestErrorPresenter';
import {
    convertTimeRangeMsToNanoseconds,
    convertUnixMillisecondsToNanoseconds,
} from '../../time/TimeNanosecondConverters';

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

describe('Fetch helper modules', () => {
    const toastErrorMock = jest.mocked(Toast.error);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('addAdminSchemaIfNeeded', () => {
        it('keeps fully qualified tables unchanged', () => {
            expect(addAdminSchemaIfNeeded('APP.table_name', 'admin')).toBe(
                'APP.table_name',
            );
        });

        it('prefixes bare tables with the admin id', () => {
            expect(addAdminSchemaIfNeeded('table_name', 'admin')).toBe(
                'ADMIN.table_name',
            );
        });
    });

    describe('calculateSampleCount', () => {
        it('returns the explicit row limit when one is configured', () => {
            expect(calculateSampleCount(10, false, 20, 40, 500)).toBe(10);
        });

        it('uses raw pixels per tick for raw data', () => {
            expect(calculateSampleCount(-1, true, 10, 25, 500)).toBe(20);
        });

        it('caps raw data with the raw pixel setting even when sampling is disabled', () => {
            expect(calculateSampleCount(-1, true, 25, 10, 500)).toBe(50);
        });

        it('uses regular pixels per tick when sampling non-raw data', () => {
            expect(calculateSampleCount(-1, false, 25, 10, 500)).toBe(20);
        });
    });

    describe('fetch time conversion', () => {
        it('converts one millisecond timestamp into nanoseconds', () => {
            expect(convertUnixMillisecondsToNanoseconds(123)).toBe(123000000);
        });

        it('converts a millisecond range into a nanosecond fetch range', () => {
            expect(
                convertTimeRangeMsToNanoseconds({
                    startTime: 100,
                    endTime: 200,
                }),
            ).toEqual({
                startTime: 100000000,
                endTime: 200000000,
            });
        });
    });

    describe('showRequestError', () => {
        it('ignores successful backend payloads that do not include an HTTP status', () => {
            showRequestError({
                data: {
                    columns: ['USER_NAME'],
                    types: ['string'],
                    rows: [],
                },
                success: true,
                reason: 'success',
                elapse: '525.9µs',
            });

            expect(toastErrorMock).not.toHaveBeenCalled();
        });

        it('shows the backend reason for failed HTTP responses', () => {
            showRequestError({
                status: 500,
                data: {
                    reason: 'rollup query failed',
                },
            });

            expect(toastErrorMock).toHaveBeenCalledWith('rollup query failed');
        });

        it('falls back to the backend message when reason is missing', () => {
            showRequestError({
                status: 400,
                data: {
                    message: 'bad request',
                },
            });

            expect(toastErrorMock).toHaveBeenCalledWith('bad request');
        });
    });
});
