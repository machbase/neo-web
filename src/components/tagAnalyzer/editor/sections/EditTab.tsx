import Axes from './Axes';
import Data from './Data';
import Display from './Display';
import TimeRange from './TimeRange';
import General from './General';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EditTabPanelType,
    TagAnalyzerPanelEditorConfig as EditorTabCombinedConfig,
} from '../PanelEditorTypes';

// Chooses which editor section to render for the active tab.
// It centralizes tab-to-component mapping so the settings layout stays simple.
const EditTab = ({
    selectedTabType,
    editorConfig,
    setEditorConfig,
}: {
    selectedTabType: EditTabPanelType;
    editorConfig: EditorTabCombinedConfig;
    setEditorConfig: Dispatch<SetStateAction<EditorTabCombinedConfig>>;
}) => {
    if (!editorConfig.data.index_key) return null;

    switch (selectedTabType) {
        case 'General':
            return (
                <General
                    pGeneralConfig={editorConfig.general}
                    pOnChangeGeneralConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, general: aConfig }))
                    }
                />
            );
        case 'Data':
            return (
                <Data
                    pDataConfig={editorConfig.data}
                    pOnChangeTagSet={(aTagSet) =>
                        setEditorConfig((aPrev) => ({
                            ...aPrev,
                            data: { ...aPrev.data, tag_set: aTagSet },
                        }))
                    }
                />
            );
        case 'Axes':
            return (
                <Axes
                    pAxesConfig={editorConfig.axes}
                    pTagSet={editorConfig.data.tag_set}
                    pOnChangeAxesConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, axes: aConfig }))
                    }
                    pOnChangeTagSet={(aTagSet) =>
                        setEditorConfig((aPrev) => ({
                            ...aPrev,
                            data: { ...aPrev.data, tag_set: aTagSet },
                        }))
                    }
                />
            );
        case 'Display':
            return (
                <Display
                    pDisplayConfig={editorConfig.display}
                    pOnChangeDisplayConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, display: aConfig }))
                    }
                />
            );
        case 'Time':
            return (
                <TimeRange
                    pTimeConfig={editorConfig.time}
                    pOnChangeTimeConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, time: aConfig }))
                    }
                />
            );
        default:
            return null;
    }
};

export default EditTab;
