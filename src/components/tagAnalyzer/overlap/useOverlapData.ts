import { useCallback, useState } from 'react';
import { Toast } from '@/design-system/components';
import {
    filterChartDataByRange,
    mapFetchResultToChartData,
} from '../chart/chartData';
import { seriesDataApi } from '../api/seriesDataApi';
import {
    getAsyncRequestErrorMessage,
    useLatestAsyncRequest,
} from '../hooks/useLatestAsyncRequest';
import { buildMainSeriesRequest } from '../panel/panelData';
import {
    createOverlapChartSeriesGroup,
    type OverlapChartSeriesGroup,
    type OverlapPanelInput,
} from './overlapModel';

const OVERLAP_CHART_FETCH_WIDTH_PX = 1000;
const OVERLAP_LOAD_ERROR_MESSAGE = 'Failed to load overlap data.';

type OverlapLoadState = {
    seriesGroups: OverlapChartSeriesGroup[];
    isLoading: boolean;
    loadError: string | undefined;
};

export function useOverlapData(initialPanelsInfo: OverlapPanelInput[]) {
    const [loadState, setLoadState] = useState<OverlapLoadState>({
        seriesGroups: initialPanelsInfo.map((panel) =>
            createOverlapChartSeriesGroup(panel, []),
        ),
        isLoading: true,
        loadError: undefined,
    });
    const [refreshGeneration, setRefreshGeneration] = useState(0);

    useLatestAsyncRequest({
        enabled: true,
        requestKey: JSON.stringify([initialPanelsInfo, refreshGeneration]),
        fetch: (signal) => Promise.all(
            initialPanelsInfo.map((panel) =>
                fetchOverlapPanelData(panel, signal),
            ),
        ),
        onStart: () => {
            setLoadState((current) => ({
                ...current,
                isLoading: true,
                loadError: undefined,
            }));
        },
        onSuccess: (results) => {
            new Set(results.flatMap(({ errors }) => errors)).forEach(
                (message) => Toast.error(message, undefined),
            );
            setLoadState((current) => ({
                seriesGroups: preservePanelShifts(
                    results.map(({ seriesGroup }) => seriesGroup),
                    current.seriesGroups,
                ),
                isLoading: false,
                loadError: undefined,
            }));
        },
        onError: (error) => {
            const message = getAsyncRequestErrorMessage(
                error,
                OVERLAP_LOAD_ERROR_MESSAGE,
            );
            setLoadState((current) => ({
                ...current,
                isLoading: false,
                loadError: message,
            }));
            Toast.error(message, undefined);
        },
    });

    const refreshOverlapData = useCallback((): void => {
        setRefreshGeneration((current) => current + 1);
    }, []);

    const shiftPanelRange = useCallback(
        (panelKey: string, delta: number): void => {
            if (!Number.isFinite(delta) || delta === 0) return;

            setLoadState((current) => ({
                ...current,
                seriesGroups: current.seriesGroups.map((group) => {
                    if (group.panelKey !== panelKey) return group;

                    const shiftValue = group.shiftValue + delta;
                    return Number.isFinite(shiftValue)
                        ? { ...group, shiftValue }
                        : group;
                }),
            }));
        },
        [],
    );

    return { ...loadState, refreshOverlapData, shiftPanelRange };
}

async function fetchOverlapPanelData(
    overlapPanel: OverlapPanelInput,
    signal: AbortSignal,
) {
    const panelInfo = overlapPanel.panelInfo;
    const fetchResult = await seriesDataApi.fetchSeriesRows(
        buildMainSeriesRequest(
            panelInfo,
            overlapPanel.visibleRange,
            OVERLAP_CHART_FETCH_WIDTH_PX,
            {},
            { signal },
        ),
    );

    const seriesData = mapFetchResultToChartData(
        fetchResult?.filter(({ error }) => !error),
        panelInfo.query.tagSet,
        panelInfo.mode.isRaw,
        false,
    );

    return {
        seriesGroup: createOverlapChartSeriesGroup(
            overlapPanel,
            panelInfo.mode.isRaw
                ? filterChartDataByRange(
                      seriesData,
                      overlapPanel.visibleRange,
                  )
                : seriesData,
        ),
        errors:
            fetchResult?.flatMap(({ error }) =>
                error ? [error.message] : [],
            ) ?? [],
    };
}

function preservePanelShifts(
    nextGroups: OverlapChartSeriesGroup[],
    currentGroups: OverlapChartSeriesGroup[],
): OverlapChartSeriesGroup[] {
    const shiftByPanelKey = new Map(
        currentGroups.map((group) => [
            group.panelKey,
            group.shiftValue,
        ]),
    );

    return nextGroups.map((group) => ({
        ...group,
        shiftValue: shiftByPanelKey.get(group.panelKey) ?? 0,
    }));
}
