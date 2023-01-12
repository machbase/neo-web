export interface TimeRange {
    Min: string;
    Max: string;
}

export type TimeLineType = { endTime: string | number; startTime: string | number };

export type UpdateMonthYear = (month: number, year: number) => void;
