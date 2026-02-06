import { useMemo } from 'react';
import { generateUUID } from '@/utils';

export interface MockEvent {
    id: string;
    timestamp: Date;
    objects: Record<string, number>;
}

export const useEventMockData = (start: Date | null, end: Date | null) => {
    return useMemo(() => {
        if (!start || !end) return [];

        const events: MockEvent[] = [];
        const duration = end.getTime() - start.getTime();

        // Generate a random number of events between 5 and 15
        const count = Math.floor(Math.random() * 10) + 5;

        for (let i = 0; i < count; i++) {
            // Random time within the range
            const timeOffset = Math.random() * duration;
            const timestamp = new Date(start.getTime() + timeOffset);

            // Random objects
            const objects: Record<string, number> = {};
            if (Math.random() > 0.5) objects.person = Math.floor(Math.random() * 5) + 1;
            if (Math.random() > 0.5) objects.car = Math.floor(Math.random() * 3) + 1;
            if (Math.random() > 0.8) objects.truck = Math.floor(Math.random() * 2) + 1;

            // Ensure at least one object
            if (Object.keys(objects).length === 0) {
                objects.person = 1;
            }

            events.push({
                id: generateUUID(),
                timestamp,
                objects
            });
        }

        // Sort by timestamp descending (newest first)
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [start?.getTime(), end?.getTime()]);
};
