import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerBoardInfo } from './TagAnalyzerType';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerPanelInfo,
    TagAnalyzerRangeValue,
    TagAnalyzerTagItem,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelType';

export type TagAnalyzerEditTab = 'General' | 'Data' | 'Axes' | 'Display' | 'Time';

export type TagAnalyzerEditPanelPanelInfoProp = TagAnalyzerPanelInfo;
export type TagAnalyzerEditPanelBoardInfoProp = TagAnalyzerBoardInfo;
export type TagAnalyzerEditPanelSetEditPanelProp = (isOpen: boolean) => void;
export type TagAnalyzerEditPanelSetSaveEditedInfoProp = Dispatch<SetStateAction<boolean>>;
export type TagAnalyzerEditPanelNavigatorRangeProp = TagAnalyzerTimeRange;

export type TagAnalyzerEditorSectionPanelInfoProp = TagAnalyzerPanelInfo;
export type TagAnalyzerEditorSectionSetCopyPanelInfoProp = Dispatch<SetStateAction<TagAnalyzerPanelInfo>>;

export type TagAnalyzerTimeConversionTarget = {
    range_bgn: TagAnalyzerRangeValue;
    range_end: TagAnalyzerRangeValue;
    tag_set: TagAnalyzerTagItem[];
};

export type TagAnalyzerResolvedTimeRange = TagAnalyzerBgnEndTimeRange;
