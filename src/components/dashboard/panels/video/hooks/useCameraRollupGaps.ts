import { useEffect, useMemo, useState } from 'react';
import { getCameraDataGaps } from '../utils/api';
import { parseTimestamp } from '../utils/timeUtils';
import { getDataGapIntervalSeconds } from '../utils/gapInterval';

export interface TimelineGapSegment {
    left: number;
    width: number;
}

const MIN_GAP_WIDTH_PERCENT = 0.2;

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function buildMissingSegments(missingTimes: string[], start: Date, end: Date, intervalSeconds: number): TimelineGapSegment[] {
    const totalMs = end.getTime() - start.getTime();
    const intervalMs = Math.max(1, intervalSeconds) * 1000;
    if (totalMs <= 0 || intervalMs <= 0 || !Array.isArray(missingTimes) || missingTimes.length === 0) return [];

    const gapPoints = missingTimes
        .map((value) => parseTimestamp(value))
        .filter((value): value is Date => !!value)
        .sort((a, b) => a.getTime() - b.getTime());

    if (!gapPoints.length) return [];

    const segments: TimelineGapSegment[] = [];

    let segmentStart = gapPoints[0].getTime();
    let previous = gapPoints[0].getTime();

    for (let i = 1; i < gapPoints.length; i += 1) {
        const current = gapPoints[i].getTime();
        const isContinuous = current - previous <= intervalMs;

        if (!isContinuous) {
            const rawStart = Math.max(segmentStart, start.getTime());
            const rawEnd = Math.min(previous + intervalMs, end.getTime());

            if (rawEnd > rawStart) {
                const left = ((rawStart - start.getTime()) / totalMs) * 100;
                const width = ((rawEnd - rawStart) / totalMs) * 100;
                segments.push({ left: clampPercent(left), width: Math.max(MIN_GAP_WIDTH_PERCENT, clampPercent(width)) });
            }

            segmentStart = current;
        }

        previous = current;
    }

    const rawStart = Math.max(segmentStart, start.getTime());
    const rawEnd = Math.min(previous + intervalMs, end.getTime());
    if (rawEnd > rawStart) {
        const left = ((rawStart - start.getTime()) / totalMs) * 100;
        const width = ((rawEnd - rawStart) / totalMs) * 100;
        segments.push({ left: clampPercent(left), width: Math.max(MIN_GAP_WIDTH_PERCENT, clampPercent(width)) });
    }

    return segments;
}

export function useCameraRollupGaps(cameraId: string | null, start: Date | null, end: Date | null, enabled = true, baseUrl?: string): TimelineGapSegment[] {
    const [missingTimes, setMissingTimes] = useState<string[]>([]);
    const [resolvedInterval, setResolvedInterval] = useState<number>(8);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!enabled || !cameraId || !start || !end || end.getTime() <= start.getTime()) {
                setMissingTimes([]);
                setResolvedInterval(8);
                return;
            }

            const requestInterval = getDataGapIntervalSeconds(start, end);
            const response = await getCameraDataGaps(cameraId, start.toISOString(), end.toISOString(), requestInterval, baseUrl);
            if (cancelled) return;

            const intervalFromResponse = Number(response.interval);
            const effectiveInterval = Number.isFinite(intervalFromResponse) && intervalFromResponse > 0 ? intervalFromResponse : requestInterval;

            setMissingTimes(Array.isArray(response.missing_times) ? response.missing_times : []);
            setResolvedInterval(effectiveInterval);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [cameraId, start?.getTime(), end?.getTime(), enabled, baseUrl]);

    return useMemo(() => {
        if (!enabled || !start || !end || end.getTime() <= start.getTime()) {
            return [];
        }
        return buildMissingSegments(missingTimes, start, end, resolvedInterval);
    }, [missingTimes, resolvedInterval, start?.getTime(), end?.getTime(), enabled]);
}
