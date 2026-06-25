import { useEffect, useRef, useState } from 'react';
import { Toast } from '@/design-system/components';
import type { FetchPanelSeriesRowsResult } from '../../fetch/panelData/PanelDataFetchTypes';

export enum PanelChartLoadStatus {
    Idle = 'idle',
    Loading = 'loading',
    Ready = 'ready',
    Failed = 'failed',
}

export type PanelSeriesFetchState = {
    result: FetchPanelSeriesRowsResult | undefined;
    status: PanelChartLoadStatus;
};

type UsePanelSeriesFetchTask = {
    fetchFn: () => Promise<FetchPanelSeriesRowsResult | undefined>;
    validate?: (result: FetchPanelSeriesRowsResult) => void;
    onSuccess?: (result: FetchPanelSeriesRowsResult) => void;
};

type UsePanelSeriesFetchParams = UsePanelSeriesFetchTask & {
    canFetch: boolean;
    cacheKey: string;
};

const INITIAL_FETCH_STATE: PanelSeriesFetchState = {
    result: undefined,
    status: PanelChartLoadStatus.Idle,
};

export function usePanelSeriesFetch({
    canFetch,
    cacheKey,
    fetchFn,
    validate,
    onSuccess,
}: UsePanelSeriesFetchParams): PanelSeriesFetchState {
    const [state, setState] = useState<PanelSeriesFetchState>(INITIAL_FETCH_STATE);
    const requestIdRef = useRef(0);
    const taskRef = useRef<UsePanelSeriesFetchTask>({
        fetchFn,
        validate,
        onSuccess,
    });
    taskRef.current = { fetchFn, validate, onSuccess };

    useEffect(() => {
        if (!canFetch) {
            requestIdRef.current += 1;
            setState(INITIAL_FETCH_STATE);
            return;
        }

        const sRequestId = ++requestIdRef.current;
        setState({ result: undefined, status: PanelChartLoadStatus.Loading });

        void (async () => {
            try {
                const sResult = await taskRef.current.fetchFn();
                if (sRequestId !== requestIdRef.current) return;
                if (!sResult) throw new Error('Panel fetch did not return a result.');

                taskRef.current.validate?.(sResult);
                setState({ result: sResult, status: PanelChartLoadStatus.Ready });
                taskRef.current.onSuccess?.(sResult);
            } catch (error) {
                if (sRequestId !== requestIdRef.current) return;
                showFetchError(error);
                setState({ result: undefined, status: PanelChartLoadStatus.Failed });
            }
        })();
    }, [canFetch, cacheKey]);

    return state;
}

function showFetchError(error: unknown): void {
    Toast.error(
        error instanceof Error && error.message
            ? error.message
            : 'Failed to load chart data.',
        undefined,
    );
}
