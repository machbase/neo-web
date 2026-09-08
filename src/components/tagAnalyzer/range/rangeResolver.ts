import {
    createRangeFromCenterAndWidth,
    fitRangeWithinBounds,
    getEnclosingRange,
    getRangeCenter,
    getRangeWidth,
    isRangeWithin,
    shiftRange,
} from './rangeArithmetic';
import type { AxisRange, RangeState } from './rangeModel';

const MAIN_RANGE_SHIFT_RATIO = 0.3;
const NAVIGATOR_RANGE_SHIFT_RATIO = 0.1;
const FOCUS_MAIN_RANGE_WIDTH_RATIO = 0.2;
const INITIAL_MAIN_RANGE_WIDTH_RATIO = 0.25;
const MINIMUM_SELECTION_WIDTH_PX = 36;
const TARGET_SELECTION_WIDTH_PX = 40;

export type RangeButtonAction =
    | 'zoom-in-small'
    | 'zoom-in-large'
    | 'zoom-out-small'
    | 'zoom-out-large'
    | 'focus'
    | 'shift-main-left'
    | 'shift-main-right'
    | 'shift-navigator-left'
    | 'shift-navigator-right';

export type RangeChange =
    | { type: 'main'; range: AxisRange }
    | { type: 'navigator'; range: AxisRange }
    | { type: 'replace'; range: RangeState };

export function enforceNavigatorTrackWidth(
    range: RangeState,
    navigatorTrackWidth: number,
    fixedRange: 'main' | 'navigator',
): RangeState {
    const mainRangeWidth = getRangeWidth(range.mainRange);
    const navigatorRangeWidth = getRangeWidth(range.navigatorRange);
    const minimumPixelWidth = Math.min(
        MINIMUM_SELECTION_WIDTH_PX,
        navigatorTrackWidth,
    );

    if (
        (mainRangeWidth * navigatorTrackWidth) / navigatorRangeWidth >=
        minimumPixelWidth
    ) {
        return range;
    }

    if (fixedRange === 'main') {
        const targetPixelWidth = Math.min(
            TARGET_SELECTION_WIDTH_PX,
            navigatorTrackWidth,
        );
        const navigatorWidth = Math.max(
            mainRangeWidth,
            (mainRangeWidth * navigatorTrackWidth) / targetPixelWidth,
        );

        return {
            mainRange: range.mainRange,
            navigatorRange: getEnclosingRange(
                range.mainRange,
                createRangeFromCenterAndWidth(
                    getRangeCenter(range.mainRange),
                    navigatorWidth,
                ),
            ),
        };
    }

    const targetMainRatio = Math.min(
        Math.max(
            INITIAL_MAIN_RANGE_WIDTH_RATIO,
            Math.min(TARGET_SELECTION_WIDTH_PX, navigatorTrackWidth) /
                navigatorTrackWidth,
        ),
        1,
    );
    const mainRange = fitRangeWithinBounds(
        createRangeFromCenterAndWidth(
            getRangeCenter(range.mainRange),
            navigatorRangeWidth * targetMainRatio,
        ),
        range.navigatorRange,
    );

    return {
        mainRange,
        navigatorRange: range.navigatorRange,
    };
}

export function resolveButtonPress(
    range: RangeState,
    action: RangeButtonAction,
): RangeState {
    switch (action) {
        case 'shift-main-left':
        case 'shift-main-right': {
            const mainRange = shiftRange(
                range.mainRange,
                getRangeWidth(range.mainRange) *
                    MAIN_RANGE_SHIFT_RATIO *
                    (action === 'shift-main-left' ? -1 : 1),
            );
            let navigatorRange = range.navigatorRange;

            if (mainRange.start < navigatorRange.start) {
                navigatorRange = shiftRange(
                    navigatorRange,
                    mainRange.start - navigatorRange.start,
                );
            } else if (mainRange.end > navigatorRange.end) {
                navigatorRange = shiftRange(
                    navigatorRange,
                    mainRange.end - navigatorRange.end,
                );
            }

            return resolveRangeChange(range, {
                type: 'replace',
                range: { mainRange, navigatorRange },
            });
        }
        case 'shift-navigator-left':
        case 'shift-navigator-right':
            return resolveRangeChange(range, {
                type: 'navigator',
                range: shiftRange(
                    range.navigatorRange,
                    getRangeWidth(range.navigatorRange) *
                        NAVIGATOR_RANGE_SHIFT_RATIO *
                        (action === 'shift-navigator-left' ? -1 : 1),
                ),
            });
        case 'zoom-in-small':
        case 'zoom-in-large':
        case 'zoom-out-small':
        case 'zoom-out-large': {
            const widthRatio = action === 'zoom-in-small'
                ? 0.5
                : action === 'zoom-in-large'
                  ? 0.25
                  : action === 'zoom-out-small'
                    ? 2
                    : 4;
            const nextMainRange = createRangeFromCenterAndWidth(
                getRangeCenter(range.mainRange),
                getRangeWidth(range.mainRange) * widthRatio,
            );
            if (
                !Number.isFinite(nextMainRange.start) ||
                !Number.isFinite(nextMainRange.end) ||
                nextMainRange.start >= nextMainRange.end
            ) {
                return range;
            }

            return resolveRangeChange(range, {
                type: 'main',
                range: nextMainRange,
            });
        }
        case 'focus':
            return resolveRangeChange(range, {
                type: 'replace',
                range: {
                    mainRange: createRangeFromCenterAndWidth(
                        getRangeCenter(range.mainRange),
                        getRangeWidth(range.mainRange) *
                            FOCUS_MAIN_RANGE_WIDTH_RATIO,
                    ),
                    navigatorRange: range.mainRange,
                },
            });
    }
}

export function resolveRangeChange(
    current: RangeState,
    change: RangeChange,
): RangeState {
    switch (change.type) {
        case 'main':
            return {
                mainRange: change.range,
                navigatorRange: isRangeWithin(
                    change.range,
                    current.navigatorRange,
                )
                    ? current.navigatorRange
                    : getEnclosingRange(
                          change.range,
                          current.navigatorRange,
                      ),
            };
        case 'navigator':
            return {
                mainRange: fitRangeWithinBounds(
                    current.mainRange,
                    change.range,
                ),
                navigatorRange: change.range,
            };
        case 'replace': {
            const { mainRange, navigatorRange } = change.range;

            return {
                mainRange,
                navigatorRange: isRangeWithin(mainRange, navigatorRange)
                    ? navigatorRange
                    : getEnclosingRange(mainRange, navigatorRange),
            };
        }
    }
}
