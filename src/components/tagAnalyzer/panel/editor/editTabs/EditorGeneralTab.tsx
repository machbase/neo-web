import { Input, Checkbox } from '@/design-system/components';
import type { PanelEditorConfig } from '../EditorTypes';
import styles from '../PanelEditor.module.scss';

type GeneralFlagField = 'use_zoom' | 'use_last_viewed_range';

const EditorGeneralTab = ({
    pGeneralConfig,
    pOnChangeGeneralConfig,
}: {
    pGeneralConfig: PanelEditorConfig['general'];
    pOnChangeGeneralConfig: (config: PanelEditorConfig['general']) => void;
}) => {
    const setGeneralFlag = (field: GeneralFlagField, checked: boolean) => {
        if (field === 'use_last_viewed_range' && !checked) {
            pOnChangeGeneralConfig({
                ...pGeneralConfig,
                [field]: false,
                last_viewed_range: undefined,
            });
            return;
        }

        pOnChangeGeneralConfig({
            ...pGeneralConfig,
            [field]: checked,
        });
    };

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Chart title</span>
            </div>
            <div className={styles.controlGrid}>
                <Input
                    aria-label="Chart title"
                    value={pGeneralConfig.chart_title}
                    onChange={(event) => {
                        pOnChangeGeneralConfig({
                            ...pGeneralConfig,
                            chart_title: event.target.value,
                        });
                    }}
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
                        setGeneralFlag('use_last_viewed_range', event.target.checked)
                    }
                    label="Keep Navigator Position"
                    size="sm"
                />
            </div>
        </section>
    );
};

export default EditorGeneralTab;
