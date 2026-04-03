import Axes from './Axes';
import Data from './Data';
import Display from './Display';
import TimeRange from './TimeRange';
import General from './General';
import type { Dispatch, SetStateAction } from 'react';
import type { TagAnalyzerEditTab, TagAnalyzerPanelInfo } from '../../TagAnalyzerType';

type TagAnalyzerEditTabProps = {
    pSelectedTab: TagAnalyzerEditTab;
    pPanelInfo: TagAnalyzerPanelInfo;
    pSetCopyPanelInfo: Dispatch<SetStateAction<TagAnalyzerPanelInfo>>;
};

type TagAnalyzerEditSectionComponent = ({
    pPanelInfo,
    pSetCopyPanelInfo,
}: {
    pPanelInfo: TagAnalyzerPanelInfo;
    pSetCopyPanelInfo: Dispatch<SetStateAction<TagAnalyzerPanelInfo>>;
}) => JSX.Element;

const TAB_COMPONENTS: Record<TagAnalyzerEditTab, TagAnalyzerEditSectionComponent> = {
    General,
    Data,
    Axes,
    Display,
    Time: TimeRange,
};

// Chooses which editor section to render for the active tab.
// It centralizes tab-to-component mapping so the settings layout stays simple.
const EditTab = ({ pSelectedTab, pPanelInfo, pSetCopyPanelInfo }: TagAnalyzerEditTabProps) => {
    if (!pPanelInfo.index_key) return null;

    const ActiveTabComponent = TAB_COMPONENTS[pSelectedTab];

    return <ActiveTabComponent pPanelInfo={pPanelInfo} pSetCopyPanelInfo={pSetCopyPanelInfo} />;
};

export default EditTab;
