import Axes from './Axes';
import Data from './Data';
import Display from './Display';
import TimeRange from './TimeRange';
import General from './General';
import type { Dispatch, SetStateAction } from 'react';
import type {
    PanelEditTab,
    TagAnalyzerPanelEditorConfig,
} from '../PanelEditorTypes';

// Chooses which editor section to render for the active tab.
// It centralizes tab-to-component mapping so the settings layout stays simple.
const EditTab = ({
    pSelectedTab,
    pEditorConfig,
    pSetEditorConfig,
}: {
    pSelectedTab: PanelEditTab;
    pEditorConfig: TagAnalyzerPanelEditorConfig;
    pSetEditorConfig: Dispatch<SetStateAction<TagAnalyzerPanelEditorConfig>>;
}) => {
    if (!pEditorConfig.data.index_key) return null;

    switch (pSelectedTab) {
        case 'General':
            return <General pGeneralConfig={pEditorConfig.general} pOnChangeGeneralConfig={(aConfig) => pSetEditorConfig((aPrev) => ({ ...aPrev, general: aConfig }))} />;
        case 'Data':
            return <Data pDataConfig={pEditorConfig.data} pOnChangeTagSet={(aTagSet) => pSetEditorConfig((aPrev) => ({ ...aPrev, data: { ...aPrev.data, tag_set: aTagSet } }))} />;
        case 'Axes':
            return (
                <Axes
                    pAxesConfig={pEditorConfig.axes}
                    pTagSet={pEditorConfig.data.tag_set}
                    pOnChangeAxesConfig={(aConfig) => pSetEditorConfig((aPrev) => ({ ...aPrev, axes: aConfig }))}
                    pOnChangeTagSet={(aTagSet) => pSetEditorConfig((aPrev) => ({ ...aPrev, data: { ...aPrev.data, tag_set: aTagSet } }))}
                />
            );
        case 'Display':
            return <Display pDisplayConfig={pEditorConfig.display} pOnChangeDisplayConfig={(aConfig) => pSetEditorConfig((aPrev) => ({ ...aPrev, display: aConfig }))} />;
        case 'Time':
            return <TimeRange pTimeConfig={pEditorConfig.time} pOnChangeTimeConfig={(aConfig) => pSetEditorConfig((aPrev) => ({ ...aPrev, time: aConfig }))} />;
        default:
            return null;
    }
};

export default EditTab;
