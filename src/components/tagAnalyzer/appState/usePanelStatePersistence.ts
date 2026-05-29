import { useEffect, useRef } from 'react';
import type {
    BoardInfo,
    PersistPanelStatePayload,
} from '../domain/BoardDomain';
import type { PanelInfo } from '../domain/PanelDomain';
import type { PanelNavigatorRangePair } from '../domain/time/TimeTypes';
import { isSameTimeRange } from '../domain/time/TimeRangeUtils';
import {
    getNextBoardListWithSavedPanels,
    type GlobalBoardListState,
} from './gBoardListUpdater';

type PersistedPanelStateUpdate = {
    timeInfo: PanelNavigatorRangePair;
    isRaw: boolean;
};

type PendingPanelStateUpdates = Record<string, PersistedPanelStateUpdate>;

const PANEL_STATE_PERSIST_DEBOUNCE_MS = 150;

function hasPersistedTimeRangeChanged(
    panel: PanelInfo,
    timeInfo: PanelNavigatorRangePair,
    isRaw: boolean,
): boolean {
    const sCurrentLastViewedRange = panel.general.last_viewed_range;

    return (
        panel.general.is_raw !== isRaw ||
        !sCurrentLastViewedRange?.panelRange ||
        !sCurrentLastViewedRange?.navigatorRange ||
        !isSameTimeRange(sCurrentLastViewedRange.panelRange, timeInfo.panelRange) ||
        !isSameTimeRange(sCurrentLastViewedRange.navigatorRange, timeInfo.navigatorRange)
    );
}

function applyPendingTimeRangeUpdates(
    panels: PanelInfo[],
    pendingUpdates: PendingPanelStateUpdates,
): PanelInfo[] {
    let sHasChanges = false;

    const sNextPanels = panels.map((panel) => {
        const sPendingUpdate = pendingUpdates[panel.data.index_key];
        if (!sPendingUpdate) {
            return panel;
        }

        if (
            !hasPersistedTimeRangeChanged(
                panel,
                sPendingUpdate.timeInfo,
                sPendingUpdate.isRaw,
            )
        ) {
            return panel;
        }

        sHasChanges = true;
        return {
            ...panel,
            general: {
                ...panel.general,
                is_raw: sPendingUpdate.isRaw,
                last_viewed_range: {
                    ...sPendingUpdate.timeInfo,
                },
            },
        };
    });

    return sHasChanges ? sNextPanels : panels;
}

export function usePanelStatePersistence({
    boardInfo,
    updateBoardList,
}: {
    boardInfo: BoardInfo;
    updateBoardList: (
        updater: (boards: GlobalBoardListState) => GlobalBoardListState,
    ) => void;
}): (payload: PersistPanelStatePayload) => void {
    const latestBoardInfoRef = useRef<BoardInfo | undefined>(undefined);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pendingPanelStateUpdatesRef = useRef<PendingPanelStateUpdates>({});

    latestBoardInfoRef.current = boardInfo;

    function flushPendingPanelStatePersistence(): void {
        const sPendingUpdates = pendingPanelStateUpdatesRef.current;
        const sPendingKeys = Object.keys(sPendingUpdates);
        const sBoardInfo = latestBoardInfoRef.current;

        if (!sBoardInfo || sPendingKeys.length === 0) {
            return;
        }

        pendingPanelStateUpdatesRef.current = {};
        const sNextPanels = applyPendingTimeRangeUpdates(
            sBoardInfo.panels,
            sPendingUpdates,
        );

        if (sNextPanels === sBoardInfo.panels) {
            return;
        }

        updateBoardList((prev) =>
            getNextBoardListWithSavedPanels(prev, sBoardInfo.id, sNextPanels),
        );
    }

    function schedulePersistPanelState({
        targetPanelKey,
        timeInfo,
        isRaw,
    }: PersistPanelStatePayload): void {
        const sBoardInfo = latestBoardInfoRef.current;
        const sPanel = sBoardInfo?.panels.find(
            (item) => item.data.index_key === targetPanelKey,
        );

        if (sPanel && !hasPersistedTimeRangeChanged(sPanel, timeInfo, isRaw)) {
            return;
        }

        pendingPanelStateUpdatesRef.current = {
            ...pendingPanelStateUpdatesRef.current,
            [targetPanelKey]: {
                timeInfo,
                isRaw,
            },
        };

        if (persistTimerRef.current) {
            clearTimeout(persistTimerRef.current);
        }

        persistTimerRef.current = setTimeout(() => {
            persistTimerRef.current = undefined;
            flushPendingPanelStatePersistence();
        }, PANEL_STATE_PERSIST_DEBOUNCE_MS);
    }

    useEffect(() => {
        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current);
                persistTimerRef.current = undefined;
            }

            flushPendingPanelStatePersistence();
        };
    }, []);

    return schedulePersistPanelState;
}
