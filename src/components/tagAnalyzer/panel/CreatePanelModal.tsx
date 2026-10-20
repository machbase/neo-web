import { useState } from 'react';
import { Check } from '@/assets/icons/Icon';
import { Input } from '@/design-system/components';
import { Field, Inline, Stack, Text } from '../ui/Presentation';
import { SeriesDialog } from '../ui/SeriesDialog';
import { PANEL_CHART_TYPES } from './chartTypeOptions';
import {
    createNewPanelInfo,
    DEFAULT_NEW_PANEL_TITLE,
    type PanelEChartType,
    type PanelInfo,
} from './panelModel';
import type { PanelSeriesDefinition } from '../seriesModel';
import type { RollupTableMap } from '../api/rollupMetadata';
import { PanelSeriesEditor } from './series/PanelSeriesEditor';
import styles from './CreatePanelModal.module.scss';
import controls from '../ui/Controls.module.scss';

export function CreatePanelModal({
    rollupTableList,
    onClose,
    onCreatePanel,
}: {
    rollupTableList: RollupTableMap;
    onClose: () => void;
    onCreatePanel: (panelInfo: PanelInfo) => void;
}) {
    const [sChartTitle, setChartTitle] = useState(DEFAULT_NEW_PANEL_TITLE);
    const [sSelectedChartType, setSelectedChartType] =
        useState<PanelEChartType>('Line');
    const [sSelectedTags, setSelectedTags] = useState<PanelSeriesDefinition[]>([]);
    const [sFooterMessage, setFooterMessage] = useState<string | undefined>();

    function applyPanel(): void {
        onCreatePanel(createNewPanelInfo(
            sSelectedTags,
            sChartTitle,
            sSelectedChartType,
        ));
        onClose();
    }

    return (
        <SeriesDialog
            title="New Chart"
            className={styles.modal}
            bodyClassName={styles.body}
            onClose={onClose}
            onApply={applyPanel}
            message={sFooterMessage}
            applyDisabled={sSelectedTags.length === 0}
            applyTestId="tag-analyzer-create-panel-apply-button"
            data-testid="tag-analyzer-create-panel-dialog"
        >
            <Input
                label="Chart name"
                data-testid="tag-analyzer-create-panel-name-input"
                value={sChartTitle}
                onChange={(event) => setChartTitle(event.target.value)}
                fullWidth
                size="md"
            />
            <Field label="Chart type">
                <Inline gap={8} justify="between">
                    {PANEL_CHART_TYPES.map(({ type, Icon, label }) => {
                        const isActive = sSelectedChartType === type;
                        return (
                            <button
                                key={type}
                                data-testid={`chart-type-${type}`}
                                className={`${controls.selectable} ${styles.chartTypeButton}`}
                                type="button"
                                onClick={() => setSelectedChartType(type)}
                                aria-pressed={isActive}
                            >
                                <Stack as="span" align="center" gap={8}>
                                    <Icon size={26} />
                                    <Inline as="span" gap={4}>
                                        <Text variant="label">{label}</Text>
                                        {isActive ? <Check size={14} /> : null}
                                    </Inline>
                                </Stack>
                            </button>
                        );
                    })}
                </Inline>
            </Field>
            <PanelSeriesEditor
                seriesList={sSelectedTags}
                rollupTableList={rollupTableList}
                onFooterMessageChange={setFooterMessage}
                onSeriesListChange={setSelectedTags}
            />
        </SeriesDialog>
    );
}
