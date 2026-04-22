import { Toast } from '@/design-system/components';
import {
    calculateSampleCount,
} from './FetchSampleCountResolver';
import { getQualifiedTableName } from './FetchTableNameResolver';
import { showRequestError } from './FetchRequestErrorPresenter';

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
    },
}));

describe('Fetch helper modules', () => {
    const toastErrorMock = jest.mocked(Toast.error);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getQualifiedTableName', () => {
        it('keeps fully qualified tables unchanged', () => {
            expect(getQualifiedTableName('APP.table_name', 'admin')).toBe('APP.table_name');
        });

        it('prefixes bare tables with the admin id', () => {
            expect(getQualifiedTableName('table_name', 'admin')).toBe('ADMIN.table_name');
        });
    });

    describe('calculateSampleCount', () => {
        it('returns -1 when the limit is already capped', () => {
            expect(calculateSampleCount(10, false, false, 20, 40, 500)).toBe(-1);
        });

        it('uses raw pixels per tick when sampling raw data', () => {
            expect(calculateSampleCount(-1, true, true, 10, 25, 500)).toBe(20);
        });

        it('uses regular pixels per tick when sampling non-raw data', () => {
            expect(calculateSampleCount(-1, false, false, 25, 10, 500)).toBe(20);
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
