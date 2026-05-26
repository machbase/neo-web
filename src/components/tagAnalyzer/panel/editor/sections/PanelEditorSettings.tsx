import EditorTabContent from './EditorTabContent';
import type { Dispatch, SetStateAction } from 'react';
import type {
    EditTabPanelType,
    PanelEditorConfig,
} from '../EditorTypes';

const PanelEditorSettings = ({
    pSelectedTab,
    pEditorConfig,
    pSetEditorConfig,
    pAvailableSourceTableNames,
    pIsRawMode,
}: {
    pSelectedTab: EditTabPanelType;
    pEditorConfig: PanelEditorConfig;
    pSetEditorConfig: Dispatch<SetStateAction<PanelEditorConfig>>;
    pAvailableSourceTableNames: string[];
    pIsRawMode: boolean;
}) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px 16px 16px',
            }}
        >
            <EditorTabContent
                selectedTabType={pSelectedTab}
                editorConfig={pEditorConfig}
                setEditorConfig={pSetEditorConfig}
                availableSourceTableNames={pAvailableSourceTableNames}
                isRawMode={pIsRawMode}
            />
        </div>
    );
};

export default PanelEditorSettings;
