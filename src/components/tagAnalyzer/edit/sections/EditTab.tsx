import Axes from './Axes';
import Data from './Data';
import Display from './Display';
import TimeRange from './TimeRange';
import General from './General';
import type {
    TagAnalyzerEditTab,
    TagAnalyzerEditorSectionPanelInfoProp,
    TagAnalyzerEditorSectionSetCopyPanelInfoProp,
} from '../../TagAnalyzerType';

type TagAnalyzerEditTabProps = {
    pSelectedTab: TagAnalyzerEditTab;
    pPanelInfo: TagAnalyzerEditorSectionPanelInfoProp;
    pSetCopyPanelInfo: TagAnalyzerEditorSectionSetCopyPanelInfoProp;
};

type TagAnalyzerEditSectionComponent = ({
    pPanelInfo,
    pSetCopyPanelInfo,
}: {
    pPanelInfo: TagAnalyzerEditorSectionPanelInfoProp;
    pSetCopyPanelInfo: TagAnalyzerEditorSectionSetCopyPanelInfoProp;
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
