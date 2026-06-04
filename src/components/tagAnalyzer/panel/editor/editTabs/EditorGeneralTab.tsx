import { useEffect } from 'react';
import { Checkbox, Input } from '@/design-system/components';
import type { PanelEditorConfig } from '../PanelEditor';
import styles from '../PanelEditor.module.scss';

type EditorGeneralTabProps = {
    pGeneralConfig: PanelEditorConfig['general'];
    pCanKeepCurrentViewRange: boolean;
    pOnChangeGeneralConfig: (generalConfig: PanelEditorConfig['general']) => void;
};

function EditorGeneralTab({
    pGeneralConfig,
    pCanKeepCurrentViewRange,
    pOnChangeGeneralConfig,
}: EditorGeneralTabProps) {
    useEffect(() => {
        if (
            pCanKeepCurrentViewRange ||
            !pGeneralConfig.use_last_viewed_range
        ) {
            return;
        }

        pOnChangeGeneralConfig({
            ...pGeneralConfig,
            use_last_viewed_range: false,
            last_viewed_range: undefined,
        });
    }, [pCanKeepCurrentViewRange, pGeneralConfig, pOnChangeGeneralConfig]);

    function setGeneralFlag(
        field: 'use_zoom' | 'use_last_viewed_range',
        checked: boolean,
    ): void {
        if (
            field === 'use_last_viewed_range' &&
            checked &&
            !pCanKeepCurrentViewRange
        ) {
            throw new Error('Cannot keep current view range before saving a TAZ file.');
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
                <Checkbox
                    checked={
                        pCanKeepCurrentViewRange &&
                        pGeneralConfig.use_last_viewed_range
                    }
                    disabled={!pCanKeepCurrentViewRange}
                    onChange={(event) =>
                        setGeneralFlag(
                            'use_last_viewed_range',
                            event.target.checked,
                        )
                    }
                    label="Keep Current View Range"
                    size="sm"
                />
                <div className={styles.savedRangePreview}>
                    <div className={styles.savedRangeWarning}>
                        {pCanKeepCurrentViewRange
                            ? 'This will make the Save button save the current range of the chart in the TAZ file.'
                            : 'You do not have the TAZ file saved yet. Save the board before using Keep Current View Range.'}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EditorGeneralTab;
