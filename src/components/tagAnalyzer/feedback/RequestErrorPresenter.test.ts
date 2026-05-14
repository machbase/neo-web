import { Toast } from '@/design-system/components';
import { showRequestError } from './RequestErrorPresenter';

jest.mock('@/design-system/components', () => ({
    Toast: {
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

describe('RequestErrorPresenter', () => {
    const toastErrorMock = jest.mocked(Toast.error);

    beforeEach(() => {
        jest.clearAllMocks();
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
                elapse: '525.9us',
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
