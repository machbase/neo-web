import { useLayoutEffect } from 'react';
import { renderHook } from '@testing-library/react';
import { useLatestAsyncRequest } from './useLatestAsyncRequest';

describe('useLatestAsyncRequest', () => {
    it('ignores an obsolete success after a newer request key commits', () => {
        let obsoleteSignal: AbortSignal | undefined;
        let deliverObsolete: ((result: string) => void) | undefined;
        let obsoleteWasActiveWhenDelivered = false;
        const obsoleteRequest = {
            then(onSuccess: (result: string) => void) {
                deliverObsolete = onSuccess;
            },
        } as unknown as Promise<string>;
        const onSuccess = jest.fn();
        const onError = jest.fn();
        const initialProps = {
            requestKey: 'old',
            deliverObsoleteOnCommit: false,
        };

        const { rerender } = renderHook(
            ({ requestKey, deliverObsoleteOnCommit }) => {
                useLatestAsyncRequest({
                    enabled: true,
                    requestKey,
                    fetch: (signal) => {
                        if (requestKey === 'old') {
                            obsoleteSignal = signal;
                            return obsoleteRequest;
                        }

                        return new Promise<string>(() => undefined);
                    },
                    onSuccess,
                    onError,
                });

                useLayoutEffect(() => {
                    if (!deliverObsoleteOnCommit) return;

                    obsoleteWasActiveWhenDelivered =
                        obsoleteSignal !== undefined &&
                        !obsoleteSignal.aborted;
                    deliverObsolete?.('obsolete');
                }, [deliverObsoleteOnCommit]);
            },
            { initialProps },
        );

        expect(deliverObsolete).toBeDefined();

        rerender({
            requestKey: 'new',
            deliverObsoleteOnCommit: true,
        });

        expect(obsoleteWasActiveWhenDelivered).toBe(true);
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });
});
