import { Checkbox, Input } from '@/design-system/components';
import type { PanelEditorConfig } from '../PanelEditor';
import styles from '../PanelEditor.module.scss';

type EditorGeneralTabProps = {
    pGeneralConfig: PanelEditorConfig['general'];
    pIsRawMode: boolean;
    pOnChangeGeneralConfig: (generalConfig: PanelEditorConfig['general']) => void;
};

function EditorGeneralTab({
    pGeneralConfig,
    pIsRawMode,
    pOnChangeGeneralConfig,
}: EditorGeneralTabProps) {
    function setGeneralFlag(
        field: 'use_zoom' | 'use_last_viewed_range' | 'is_order_by',
        checked: boolean,
    ): void {
        if (field === 'is_order_by' && !pIsRawMode) {
            throw new Error('Raw order by can only be changed in raw mode.');
        }

        pOnChangeGeneralConfig({
            ...pGeneralConfig,
            [field]: checked,
            ...(field === 'use_last_viewed_range' && !checked
                ? { last_viewed_range: undefined }
                : {}),
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
                    value={pGeneralConfig.chart_title}
                    onChange={(event) =>
                        pOnChangeGeneralConfig({
                            ...pGeneralConfig,
                            chart_title: event.target.value,
                        })
                    }
                    size="md"
                    style={{ width: '220px' }}
                />
            </div>
            <div className={styles.controlStack}>
                <Checkbox
                    checked={pGeneralConfig.use_zoom}
                    onChange={(event) =>
                        setGeneralFlag('use_zoom', event.target.checked)
                    }
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
                        checked={pIsRawMode ? pGeneralConfig.is_order_by : true}
                        disabled={!pIsRawMode}
                        onChange={(event) =>
                            setGeneralFlag('is_order_by', event.target.checked)
                        }
                        label="Order raw data by time"
                        size="sm"
                    />
                </span>
                <Checkbox
                    checked={pGeneralConfig.use_last_viewed_range}
                    onChange={(event) =>
                        setGeneralFlag(
                            'use_last_viewed_range',
                            event.target.checked,
                        )
                    }
                    label="Save current visible range in TAZ"
                    size="sm"
                />
                <div className={styles.savedRangePreview}>
                    <div className={styles.savedRangeWarning}>
                        {pGeneralConfig.use_last_viewed_range
                            ? "Range will be saved: Save and Save As store this panel's current visible range in the TAZ."
                            : 'Range is temporary: Save and Save As keep the panel configured time range only.'}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EditorGeneralTab;
