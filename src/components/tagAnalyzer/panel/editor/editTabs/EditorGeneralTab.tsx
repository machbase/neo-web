import { Checkbox, Input } from '@/design-system/components';
import type { PanelEditorConfig } from '../PanelEditor';
import styles from '../PanelEditor.module.scss';

type EditorGeneralTabProps = {
    pGeneralConfig: PanelEditorConfig['general'];
    pOnChangeGeneralConfig: (generalConfig: PanelEditorConfig['general']) => void;
};

function EditorGeneralTab({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: EditorGeneralTabProps) {
    function setGeneralFlag(
        field: 'use_zoom' | 'use_last_viewed_range',
        checked: boolean,
    ): void {
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
                <Checkbox
                    checked={pGeneralConfig.use_last_viewed_range}
                    onChange={(event) =>
                        setGeneralFlag(
                            'use_last_viewed_range',
                            event.target.checked,
                        )
                    }
                    label="Keep Current View Range"
                    size="sm"
                />
            </div>
        </section>
    );
}

export default EditorGeneralTab;
