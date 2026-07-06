import { useState } from 'react';
import { Toast } from '@/design-system/components';
import type { PanelRangeState } from '../domain/panel/PanelInfo';
import type { PanelRangeActions } from '../domain/panel/PanelActions';
import {
    resolveDefaultNavigatorRange,
    resolveDefaultNavigatorRangeResolution,
} from '../domain/panelRange/PanelRangeResolver';
import type {
    TimeRangeInput,
    TimeRangeMs,
} from '../domain/time/TimeTypes';
import { formatAbsoluteTimeExpression } from '../domain/time/TimeRangeInputResolver';
import type { EditableTimeRangeInputResolution } from '../domain/time/TimeRangeInputParsing';
import {
    clampTimeRangeToBounds,
    isValidTimeRange,
} from '../domain/time/TimeRangeUtils';

export enum PanelRuntimeTimeRangeTarget {
    MAIN_CHART = 'MAIN_CHART',
    NAVIGATOR = 'NAVIGATOR',
}

export type PanelRuntimeTimeRangeModal = {
    title: string;
    range: TimeRangeMs;
    timeRangeInput: TimeRangeInput;
    emptyRange?: boolean | {
        placeholder?: TimeRangeInput;
    };
};

type UsePanelRuntimeTimeRangeModalParams = {
    boardTimeRange: TimeRangeInput;
    rangeState: PanelRangeState;
    displayPanelRange: TimeRangeMs;
    displayNavigatorRange: TimeRangeMs;
    isDefaultNavigatorRange: boolean;
    isNumericXAxis: boolean;
    rangeActions: Pick<
        PanelRangeActions,
        'applyExactMainRange' | 'applyExactNavigatorRange'
    >;
    onRangeStateChange: (rangeState: PanelRangeState) => void;
};

type UsePanelRuntimeTimeRangeModalResult = {
    runtimeTimeRangeModal: PanelRuntimeTimeRangeModal | undefined;
    openRuntimeTimeRangeModal: (target: PanelRuntimeTimeRangeTarget) => void;
    closeRuntimeTimeRangeModal: () => void;
    applyRuntimeConcreteRange: (range: TimeRangeMs) => boolean;
    applyRuntimeTimeRangeInput: (
        timeRangeInput: EditableTimeRangeInputResolution,
    ) => boolean;
};

export function usePanelRuntimeTimeRangeModal({
    boardTimeRange,
    rangeState,
    displayPanelRange,
    displayNavigatorRange,
    isDefaultNavigatorRange,
    isNumericXAxis,
    rangeActions,
    onRangeStateChange,
}: UsePanelRuntimeTimeRangeModalParams): UsePanelRuntimeTimeRangeModalResult {
    const [timeRangeModalTarget, setTimeRangeModalTarget] = useState<
        PanelRuntimeTimeRangeTarget | undefined
    >();

    function getRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget | undefined,
    ): PanelRuntimeTimeRangeModal | undefined {
        if (target === undefined) {
            return undefined;
        }

        switch (target) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                if (!isValidTimeRange(displayPanelRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Main Chart Value Range'
                        : 'Current Visible Main Chart Range',
                    range: displayPanelRange,
                    timeRangeInput: formatConcreteRangeForTimeInput(displayPanelRange),
                };

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                if (!isValidTimeRange(displayNavigatorRange)) {
                    return undefined;
                }

                return {
                    title: isNumericXAxis
                        ? 'Current Visible Navigator Value Range'
                        : 'Current Visible Navigator Range',
                    range: displayNavigatorRange,
                    timeRangeInput: isDefaultNavigatorRange
                        ? { start: '', end: '' }
                        : rangeState.requestNavigatorRangeInput ??
                          formatConcreteRangeForTimeInput(displayNavigatorRange),
                    emptyRange: isDefaultNavigatorRange
                        ? {
                              placeholder: getDefaultNavigatorRangePlaceholder(
                                  displayNavigatorRange,
                                  resolveDefaultNavigatorRangeResolution(
                                      boardTimeRange,
                                      rangeState.fullRange,
                                  ).source === 'board-time',
                              ),
                          }
                        : true,
                };
        }
    }

    const runtimeTimeRangeModal = getRuntimeTimeRangeModal(timeRangeModalTarget);

    function openRuntimeTimeRangeModal(
        target: PanelRuntimeTimeRangeTarget,
    ): void {
        if (getRuntimeTimeRangeModal(target) === undefined) {
            return;
        }

        setTimeRangeModalTarget(target);
    }

    function closeRuntimeTimeRangeModal(): void {
        setTimeRangeModalTarget(undefined);
    }

    function applyRuntimeConcreteRange(range: TimeRangeMs): boolean {
        if (timeRangeModalTarget === undefined) {
            return false;
        }

        switch (timeRangeModalTarget) {
            case PanelRuntimeTimeRangeTarget.MAIN_CHART:
                rangeActions.applyExactMainRange(range);
                return true;

            case PanelRuntimeTimeRangeTarget.NAVIGATOR:
                rangeActions.applyExactNavigatorRange(range);
                return true;
        }
    }

    function applyRuntimeTimeRangeInput(
        timeRangeInput: EditableTimeRangeInputResolution,
    ): boolean {
        if (timeRangeInput.status === 'empty') {
            if (timeRangeModalTarget !== PanelRuntimeTimeRangeTarget.NAVIGATOR) {
                Toast.error('Please check the entered time.');
                return false;
            }

            const sDefaultNavigatorRange = resolveDefaultNavigatorRange(
                boardTimeRange,
                rangeState.fullRange,
            );

            onRangeStateChange({
                ...rangeState,
                requestPanelRange: clampTimeRangeToBounds(
                    rangeState.requestPanelRange,
                    sDefaultNavigatorRange,
                ),
                requestNavigatorRange: sDefaultNavigatorRange,
                requestNavigatorRangeInput: undefined,
            });
            return true;
        }

        if (timeRangeInput.status !== 'valid') {
            Toast.error('Please check the entered time.');
            return false;
        }

        if (timeRangeModalTarget === PanelRuntimeTimeRangeTarget.NAVIGATOR) {
            rangeActions.applyExactNavigatorRange(
                timeRangeInput.concreteRange,
                timeRangeInput.rangeInput,
            );
            return true;
        }

        return applyRuntimeConcreteRange(timeRangeInput.concreteRange);
    }

    return {
        runtimeTimeRangeModal,
        openRuntimeTimeRangeModal,
        closeRuntimeTimeRangeModal,
        applyRuntimeConcreteRange,
        applyRuntimeTimeRangeInput,
    };
}

function formatConcreteRangeForTimeInput(range: TimeRangeMs): TimeRangeInput {
    return {
        start: formatAbsoluteTimeExpression(range.startTime),
        end: formatAbsoluteTimeExpression(range.endTime),
    };
}

function getDefaultNavigatorRangePlaceholder(
    range: TimeRangeMs,
    isBoardTimeDefault: boolean,
): TimeRangeInput {
    const sRangeInput = formatConcreteRangeForTimeInput(range);
    const sSuffix = isBoardTimeDefault ? ' (board time)' : ' (default)';

    return {
        start: `${sRangeInput.start}${sSuffix}`,
        end: `${sRangeInput.end}${sSuffix}`,
    };
}
