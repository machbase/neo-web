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
                    pOnChangeGeneralConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, general: aConfig }))
                    }
                />
            );
        case 'Data':
            return (
                <EditorDataTab
                    pDataConfig={editorConfig.data}
                    pOnChangeTagSet={(aTagSet) =>
                        setEditorConfig((aPrev) => ({
                            ...aPrev,
                            data: { ...aPrev.data, tag_set: aTagSet },
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
                <EditorDisplayTab
                    pDisplayConfig={editorConfig.display}
                    pOnChangeDisplayConfig={(aConfig) =>
                        setEditorConfig((aPrev) => ({ ...aPrev, display: aConfig }))
                    }
                />
            );
        case 'Time':
            return (
                <EditorTimeTab
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
