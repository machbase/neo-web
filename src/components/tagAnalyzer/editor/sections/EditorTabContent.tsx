import AxesSection from './AxesSection';
import DataSection from './DataSection';
import DisplaySection from './DisplaySection';
import TimeRangeSection from './TimeRangeSection';
import GeneralSection from './GeneralSection';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EditTabPanelType,
    TagAnalyzerPanelEditorConfig as EditorTabCombinedConfig,
} from '../PanelEditorTypes';

/**
 * Chooses which editor section to render for the active tab.
 * Intent: Centralize tab-to-component mapping so the settings layout stays simple.
 * @param {EditTabPanelType} selectedTabType The active editor tab.
 * @param {EditorTabCombinedConfig} editorConfig The current editor config.
 * @param {Dispatch<SetStateAction<EditorTabCombinedConfig>>} setEditorConfig Updates the editor config.
 * @returns {JSX.Element | null}
 */
const EditorTabContent = ({
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
                <GeneralSection
                    pGeneralConfig={editorConfig.general}
                    pOnChangeGeneralConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, general: aConfig }))
                    }
                />
            );
        case 'Data':
            return (
                <DataSection
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
                <AxesSection
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
                <DisplaySection
                    pDisplayConfig={editorConfig.display}
                    pOnChangeDisplayConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, display: aConfig }))
                    }
                />
            );
        case 'Time':
            return (
                <TimeRangeSection
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

export default EditorTabContent;
