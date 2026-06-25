import { Checkbox, Input } from '@/design-system/components';
import type { PanelInfo } from '../../../domain/panel/PanelConfig';
import styles from '../PanelEditor.module.scss';

type EditorGeneralTabProps = {
    pTitle: PanelInfo['title'];
    pModeConfig: PanelInfo['mode'];
    pDisplayConfig: PanelInfo['display'];
    pTimeConfig: PanelInfo['time'];
    pIsRawMode: boolean;
    pOnChangeTitle: (title: PanelInfo['title']) => void;
    pOnChangeModeConfig: (modeConfig: PanelInfo['mode']) => void;
    pOnChangeDisplayConfig: (displayConfig: PanelInfo['display']) => void;
    pOnChangeTimeConfig: (
        timeConfig: PanelInfo['time'],
    ) => void;
};

function EditorGeneralTab({
    pTitle,
    pModeConfig,
    pDisplayConfig,
    pTimeConfig,
    pIsRawMode,
    pOnChangeTitle,
    pOnChangeModeConfig,
    pOnChangeDisplayConfig,
    pOnChangeTimeConfig,
}: EditorGeneralTabProps) {
    function setUseZoom(checked: boolean): void {
        pOnChangeDisplayConfig({
            ...pDisplayConfig,
            useZoom: checked,
        });
    }

    function setUseLastViewedRange(checked: boolean): void {
        pOnChangeTimeConfig({
            ...pTimeConfig,
            useLastViewedRange: checked,
            lastViewedRange: checked ? pTimeConfig.lastViewedRange : undefined,
        });
    }

    function setRawOrderBy(checked: boolean): void {
        if (!pIsRawMode) {
            throw new Error('Raw order by can only be changed in raw mode.');
        }

        pOnChangeModeConfig({
            ...pModeConfig,
            isOrderBy: checked,
        });
    }

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Chart title</span>
            </div>
            <div className={styles.controlGrid}>
                <Input
                    aria-label="Chart title"
                    value={pTitle}
                    onChange={(event) => pOnChangeTitle(event.target.value)}
                    size="md"
                    className={styles.titleInput}
                />
            </div>
            <div className={styles.controlStack}>
                <Checkbox
                    checked={pDisplayConfig.useZoom}
                    onChange={(event) => setUseZoom(event.target.checked)}
                    label="Use Zoom when dragging"
                    size="sm"
                />
                <span
                    title={
                        pIsRawMode
                            ? undefined
                            : 'This option is only for raw data.'
                    }
                >
                    <Checkbox
                        checked={pIsRawMode ? pModeConfig.isOrderBy : true}
                        disabled={!pIsRawMode}
                        onChange={(event) => setRawOrderBy(event.target.checked)}
                        label="Order raw data by time"
                        size="sm"
                    />
                </span>
                <Checkbox
                    checked={pTimeConfig.useLastViewedRange}
                    onChange={(event) =>
                        setUseLastViewedRange(event.target.checked)
                    }
                    label="Save current visible range in TAZ"
                    size="sm"
                />
                <div className={styles.savedRangePreview}>
                    <div className={styles.savedRangeWarning}>
                        {pTimeConfig.useLastViewedRange
                            ? "Range will be saved: Save and Save As store this panel's current visible range in the TAZ."
                            : 'Range is temporary: Save and Save As keep the panel configured time range only.'}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EditorGeneralTab;
