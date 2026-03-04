export type EventTypeLabel = 'MATCH' | 'TRIGGER' | 'RESOLVE' | 'ERROR' | 'UNKNOWN';
export type EventTypeStyleSuffix = 'match' | 'trigger' | 'resolve' | 'error' | 'unknown';

const EVENT_TYPE_STYLE_SUFFIXES: Record<EventTypeLabel, EventTypeStyleSuffix> = {
    MATCH: 'match',
    TRIGGER: 'trigger',
    RESOLVE: 'resolve',
    ERROR: 'error',
    UNKNOWN: 'unknown',
};

const EVENT_TYPE_VIDEO_PANEL_CLASSES: Record<EventTypeLabel, string> = {
    MATCH: 'event-value-dot value-2',
    TRIGGER: 'event-value-dot value-1',
    RESOLVE: 'event-value-dot value-0',
    ERROR: 'event-value-dot value-minus-1',
    UNKNOWN: 'event-value-dot value-default',
};

export const normalizeEventTypeLabel = (valueLabel?: string): EventTypeLabel => {
    const normalized = valueLabel?.trim().toUpperCase();

    if (normalized === 'MATCH') return 'MATCH';
    if (normalized === 'TRIGGER') return 'TRIGGER';
    if (normalized === 'RESOLVE') return 'RESOLVE';
    if (normalized === 'ERROR') return 'ERROR';

    return 'UNKNOWN';
};

export const getEventTypeStyleSuffix = (valueLabel?: string): EventTypeStyleSuffix => {
    return EVENT_TYPE_STYLE_SUFFIXES[normalizeEventTypeLabel(valueLabel)];
};

export const getVideoPanelDotClassByValueLabel = (valueLabel?: string): string => {
    return EVENT_TYPE_VIDEO_PANEL_CLASSES[normalizeEventTypeLabel(valueLabel)];
};
