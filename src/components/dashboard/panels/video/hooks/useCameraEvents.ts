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
}

export const useCameraEvents = (cameraId: string | null, start: Date | null, end: Date | null) => {
    const [events, setEvents] = useState<VideoEvent[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!cameraId || !start || !end) {
                setEvents([]);
                return;
            }

            const startNs = BigInt(start.getTime()) * 1000000n;
            const endNs = BigInt(end.getTime()) * 1000000n;

            const response = await getCameraEvents(cameraId, startNs, endNs);
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
                    } as VideoEvent;
                })
                .filter((event) => !Number.isNaN(event.timestamp.getTime()))
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setEvents(mapped);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [cameraId, start?.getTime(), end?.getTime()]);

    return events;
};
