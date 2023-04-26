import { PanelInfo, TagSet } from './chart';
import { ChartType } from './../enums/app';
export interface ResBoardList {
    board_id: string;
    board_name: string;
    last_edit: string;
}
export interface ResPreferences {
    ip: string;
    port: string;
    theme: string;
    timeout: number;
}
export interface TimeRange {
    start: string;
    end: string;
    refresh: string;
}
export interface ResTableList {
    board_id: string;
    board_name: string;
    last_edit: string;
}
export interface TempNewChartData {
    chartType: ChartType;
    tagSet: TagSet[];
    defaultRange: any;
}

export interface BoardPanelEdit {
    index: number;
    item: PanelInfo;
}
