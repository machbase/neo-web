import EditorAxesTab from './EditorAxesTab';
import EditorDataTab from './EditorDataTab';
import EditorDisplayTab from './EditorDisplayTab';
import EditorTimeTab from './EditorTimeTab';
import EditorGeneralTab from './EditorGeneralTab';
import type { EditorTabContentProps } from '../EditorTypes';

/**
 * Chooses which editor section to render for the active tab.
 * Intent: Centralize tab-to-component mapping so the settings layout stays simple.
 * @param {EditTabPanelType} selectedTabType The active editor tab.
 * @param {PanelEditorConfig} editorConfig The current editor config.
 * @param {Dispatch<SetStateAction<PanelEditorConfig>>} setEditorConfig Updates the editor config.
 * @returns {JSX.Element | null}
 */
const EditorTabContent = ({
    selectedTabType,
    editorConfig,
    setEditorConfig,
    tables,
}: EditorTabContentProps) => {
    if (!editorConfig.data.index_key) return null;

    switch (selectedTabType) {
        case 'General':
            return (
                <EditorGeneralTab
                    pGeneralConfig={editorConfig.general}
                    pOnChangeGeneralConfig={(config) =>
                        setEditorConfig((prev) => ({ ...prev, general: config }))
                    }
                />
            );
        case 'Data':
            return (
                <EditorDataTab
                    pDataConfig={editorConfig.data}
                    pOnChangeTagSet={(tagSet) =>
                        setEditorConfig((prev) => ({
                            ...prev,
                            data: { ...prev.data, tag_set: tagSet },
                        }))
                    }
                    pTables={tables}
                />
            );
        case 'Axes':
            return (
                <EditorAxesTab
                    pAxesConfig={editorConfig.axes}
                    pTagSet={editorConfig.data.tag_set}
                    pOnChangeAxesConfig={(config) =>
                        setEditorConfig((prev) => ({ ...prev, axes: config }))
                    }
                    pOnChangeTagSet={(tagSet) =>
                        setEditorConfig((prev) => ({
                            ...prev,
                            data: { ...prev.data, tag_set: tagSet },
                        }))
                    }
                />
            );
        case 'Display':
            return (
                <EditorDisplayTab
                    pDisplayConfig={editorConfig.display}
                    pOnChangeDisplayConfig={(config) =>
                        setEditorConfig((prev) => ({ ...prev, display: config }))
                    }
                />
            );
        case 'Time':
            return (
                <EditorTimeTab
                    pTimeConfig={editorConfig.time}
                    pOnChangeTimeConfig={(config) =>
                        setEditorConfig((prev) => ({ ...prev, time: config }))
                    }
                />
            );
        default:
            return null;
    }
};

export default EditorTabContent;
