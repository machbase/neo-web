import { act, renderHook } from '@testing-library/react';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import {
    buildTimeConfigFromBoundaries,
    getTimeConfigWithUpdatedBoundary,
    parseRequiredTimeBoundary,
    useEditorTimeTabState,
} from './useEditorTimeTabState';

describe('useEditorTimeTabState', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-04-07T00:00:00.000Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('builds normalized editor time config from structured boundaries', () => {
        const sStartBoundary = parseRequiredTimeBoundary('2026-04-01 00:00:00');
        const sEndBoundary = parseRequiredTimeBoundary('2026-04-01 01:00:00');
        const sTimeConfig = buildTimeConfigFromBoundaries(sStartBoundary, sEndBoundary);

        expect(sTimeConfig).toEqual({
            range_bgn: sStartBoundary.kind === 'absolute' ? sStartBoundary.timestamp : 0,
            range_end: sEndBoundary.kind === 'absolute' ? sEndBoundary.timestamp : 0,
            range_config: {
                start: sStartBoundary,
                end: sEndBoundary,
            },
        });
    });

    it('preserves the untouched boundary when updating one side of the range', () => {
        const sOriginalStartBoundary = parseRequiredTimeBoundary('2026-04-01 00:00:00');
        const sOriginalEndBoundary = parseRequiredTimeBoundary('2026-04-01 01:00:00');
        const sNextStartBoundary = parseRequiredTimeBoundary('2026-04-02 00:00:00');
        const sBaseTimeConfig = buildTimeConfigFromBoundaries(
            sOriginalStartBoundary,
            sOriginalEndBoundary,
        );

        expect(
            getTimeConfigWithUpdatedBoundary(
                sBaseTimeConfig,
                'range_bgn',
                sNextStartBoundary,
            ),
        ).toEqual({
            range_bgn: sNextStartBoundary.kind === 'absolute' ? sNextStartBoundary.timestamp : 0,
            range_end: sOriginalEndBoundary.kind === 'absolute' ? sOriginalEndBoundary.timestamp : 0,
            range_config: {
                start: sNextStartBoundary,
                end: sOriginalEndBoundary,
            },
        });
    });

    it('throws when a required time boundary is invalid', () => {
        expect(() => parseRequiredTimeBoundary('not-a-date')).toThrow(
            'Expected a valid time boundary: not-a-date',
        );
    });

    it('syncs local input buffers from the current time config', () => {
        const sInitialTimeConfig = buildTimeConfigFromBoundaries(
            parseRequiredTimeBoundary('2026-04-01 00:00:00'),
            parseRequiredTimeBoundary('2026-04-01 01:00:00'),
        );
        const sNextTimeConfig = buildTimeConfigFromBoundaries(
            parseRequiredTimeBoundary('now-1h'),
            parseRequiredTimeBoundary('now'),
        );
        const sOnChangeTimeConfig = jest.fn();

        const { result, rerender } = renderHook(
            ({ timeConfig }) =>
                useEditorTimeTabState({
                    timeConfig,
                    onChangeTimeConfig: sOnChangeTimeConfig,
                }),
            {
                initialProps: {
                    timeConfig: sInitialTimeConfig,
                },
            },
        );

        expect(result.current.startTime).toBe('2026-04-01 00:00:00');
        expect(result.current.endTime).toBe('2026-04-01 01:00:00');

        rerender({
            timeConfig: sNextTimeConfig,
        });

        expect(result.current.startTime).toBe('now-1h');
        expect(result.current.endTime).toBe('now');
    });

    it('updates only the local buffer for invalid live input', () => {
        const sTimeConfig = buildTimeConfigFromBoundaries(
            parseRequiredTimeBoundary('2026-04-01 00:00:00'),
            parseRequiredTimeBoundary('2026-04-01 01:00:00'),
        );
        const sOnChangeTimeConfig = jest.fn();

        const { result } = renderHook(() =>
            useEditorTimeTabState({
                timeConfig: sTimeConfig,
                onChangeTimeConfig: sOnChangeTimeConfig,
            }),
        );

        act(() => {
            result.current.handleTimeChange('range_bgn', {
                target: { value: 'not-a-date' },
            });
        });

        expect(sOnChangeTimeConfig).not.toHaveBeenCalled();
        expect(result.current.startTime).toBe('not-a-date');
        expect(result.current.endTime).toBe('2026-04-01 01:00:00');
    });

    it('applies quick ranges and updates both local buffers', () => {
        const sTimeConfig = buildTimeConfigFromBoundaries(
            parseRequiredTimeBoundary('2026-04-01 00:00:00'),
            parseRequiredTimeBoundary('2026-04-01 01:00:00'),
        );
        const sOnChangeTimeConfig = jest.fn();
        const sQuickRange: QuickTimeRangeOption = {
            key: 'now-last-hour',
            name: 'Last hour',
            value: ['now-1h', 'now'],
        };

        const { result } = renderHook(() =>
            useEditorTimeTabState({
                timeConfig: sTimeConfig,
                onChangeTimeConfig: sOnChangeTimeConfig,
            }),
        );

        act(() => {
            result.current.handleQuickTime(sQuickRange);
        });

        expect(sOnChangeTimeConfig).toHaveBeenCalledWith({
            range_bgn: new Date('2026-04-06T23:00:00.000Z').getTime(),
            range_end: new Date('2026-04-07T00:00:00.000Z').getTime(),
            range_config: {
                start: {
                    kind: 'relative',
                    anchor: 'now',
                    amount: 1,
                    unit: 'h',
                    expression: 'now-1h',
                },
                end: {
                    kind: 'relative',
                    anchor: 'now',
                    amount: 0,
                    unit: undefined,
                    expression: 'now',
                },
            },
        });
        expect(result.current.startTime).toBe('now-1h');
        expect(result.current.endTime).toBe('now');
    });

    it('clears the custom range and resets both local buffers', () => {
        const sTimeConfig = buildTimeConfigFromBoundaries(
            parseRequiredTimeBoundary('now-1h'),
            parseRequiredTimeBoundary('now'),
        );
        const sOnChangeTimeConfig = jest.fn();

        const { result } = renderHook(() =>
            useEditorTimeTabState({
                timeConfig: sTimeConfig,
                onChangeTimeConfig: sOnChangeTimeConfig,
            }),
        );

        act(() => {
            result.current.handleClear();
        });

        expect(sOnChangeTimeConfig).toHaveBeenCalledWith({
            range_bgn: 0,
            range_end: 0,
            range_config: {
                start: { kind: 'empty' },
                end: { kind: 'empty' },
            },
        });
        expect(result.current.startTime).toBe('');
        expect(result.current.endTime).toBe('');
    });
});
