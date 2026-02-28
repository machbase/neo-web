import { useEffect, useState } from 'react';
import { getCameraEvents } from '../utils/api';
import { parseTimestamp } from '../utils/timeUtils';

export interface VideoEvent {
    id: string;
    timestamp: Date;
    name: string;
    value: number;
    valueLabel: string;
    expressionText: string;
    usedCountsSnapshot: Record<string, number>;
    cameraId: string;
    ruleId: string;
    rule_name: string;
}

const DEFAULT_LIVE_WINDOW_MS = 60 * 60 * 1000;

export const useCameraEvents = (cameraId: string | null, start: Date | null, end: Date | null, isLive = false, pollingEnabled = true, baseUrl?: string) => {
    const [events, setEvents] = useState<VideoEvent[]>([]);

    useEffect(() => {
        if (!pollingEnabled) return;

        let cancelled = false;

        const load = async () => {
            if (!cameraId) {
                setEvents([]);
                return;
            }

            let queryStart: Date | null = start;
            let queryEnd: Date | null = end;

            if (isLive) {
                const now = new Date();
                const hasValidWindow = !!start && !!end && end.getTime() > start.getTime();
                const windowMs = hasValidWindow ? end.getTime() - start.getTime() : DEFAULT_LIVE_WINDOW_MS;
                queryEnd = now;
                queryStart = new Date(now.getTime() - windowMs);
            }

            if (!queryStart || !queryEnd || queryEnd.getTime() <= queryStart.getTime()) {
                setEvents([]);
                return;
            }

            const startNs = BigInt(queryStart.getTime()) * 1000000n;
            const endNs = BigInt(queryEnd.getTime()) * 1000000n;

            const response = await getCameraEvents(cameraId, startNs, endNs, baseUrl);
            if (cancelled) return;

            const mapped = response
                .map((item, index) => {
                    const timeText = typeof item.time === 'string' ? item.time : '';
                    const parsedTime = parseTimestamp(timeText) ?? new Date(timeText);
                    let usedCounts: Record<string, number> = {};

                    try {
                        const parsed = JSON.parse(item.used_counts_snapshot || '{}');
                        if (parsed && typeof parsed === 'object') {
                            usedCounts = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                                if (typeof value === 'number') acc[key] = value;
                                return acc;
                            }, {});
                        }
                    } catch {
                        usedCounts = {};
                    }

                    return {
                        id: `${item.camera_id}-${item.rule_id}-${item.time}-${index}`,
                        timestamp: parsedTime,
                        name: item.name,
                        value: item.value,
                        valueLabel: item.value_label,
                        expressionText: item.expression_text,
                        usedCountsSnapshot: usedCounts,
                        cameraId: item.camera_id,
                        ruleId: item.rule_id,
                        rule_name: item.rule_name,
                    } as VideoEvent;
                })
                .filter((event) => !Number.isNaN(event.timestamp.getTime()))
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setEvents(mapped);
        };

        load();
        let timer: ReturnType<typeof setInterval> | null = null;
        if (isLive) {
            timer = setInterval(load, 1000 * 3);
        }

        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
    }, [cameraId, start?.getTime(), end?.getTime(), isLive, pollingEnabled, baseUrl]);

    return events;
};
