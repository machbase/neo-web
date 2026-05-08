import EditorAxesTab from './EditorAxesTab';
import EditorDataTab from './EditorDataTab';
import EditorDisplayTab from './EditorDisplayTab';
import EditorTimeTab from './EditorTimeTab';
import EditorGeneralTab from './EditorGeneralTab';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from '../EditorTypes';

const EditorTabContent = ({
    selectedTabType,
    editorConfig,
    setEditorConfig,
    availableSourceTableNames,
    isRawMode,
}: {
    selectedTabType: EditTabPanelType;
    editorConfig: PanelEditorConfig;
    setEditorConfig: Dispatch<SetStateAction<PanelEditorConfig>>;
    availableSourceTableNames: string[];
    isRawMode: boolean;
}) => {
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
                    pIsRawMode={isRawMode}
                    pOnChangeTagSet={(tagSet) =>
                        setEditorConfig((prev) => ({
                            ...prev,
                            data: { ...prev.data, tag_set: tagSet },
                        }))
                    }
                    pAvailableSourceTableNames={availableSourceTableNames}
                />
            );
        case 'Axes':
            return (
                <EditorAxesTab
                    pAxesConfig={editorConfig.axes}
                    pTagSet={editorConfig.data.tag_set}
                    pIsRawMode={isRawMode}
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
