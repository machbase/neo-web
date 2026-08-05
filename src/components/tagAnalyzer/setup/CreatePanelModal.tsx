import { useId, useState } from 'react';
import type { IconType } from 'react-icons';
import {
    Check,
    MdOutlineStackedLineChart,
    VscGraphLine,
    VscGraphScatter,
} from '@/assets/icons/Icon';
import { Button, Input } from '@/design-system/components';
import {
    createNewPanelInfo,
    DEFAULT_NEW_PANEL_TITLE,
    type PanelEChartType,
    type PanelInfo,
} from '../model';
import type {
    PanelSeriesDefinition,
    RollupTableMap,
} from '../seriesModel';
import { SeriesEditor } from './SeriesEditor';
import { SeriesModalFrame } from './SeriesModalFrame';
import styles from './PanelSeriesModal.module.scss';

const CHART_TYPE_OPTIONS = [
    ['Zone', MdOutlineStackedLineChart, 'Zone'],
    ['Dot', VscGraphScatter, 'Scatter'],
    ['Line', VscGraphLine, 'Line'],
] as const satisfies ReadonlyArray<readonly [PanelEChartType, IconType, string]>;

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
    const sChartNameInputId = useId();

    function applyPanel(): void {
        onCreatePanel(createNewPanelInfo(
            sSelectedTags,
            sChartTitle,
            sSelectedChartType,
        ));
        onClose();
    }

    return (
        <SeriesModalFrame
            title="New Chart"
            footerMessage={sFooterMessage}
            onClose={onClose}
            onApply={applyPanel}
        >
            <div className={styles.fieldCell}>
                <label
                    className={styles.fieldLabelTop}
                    htmlFor={sChartNameInputId}
                >
                    Chart name
                </label>
                <Input
                    id={sChartNameInputId}
                    value={sChartTitle}
                    onChange={(event) => setChartTitle(event.target.value)}
                    fullWidth
                    size="md"
                />
            </div>

            <div className={styles.chartTypeSection}>
                <span className={styles.fieldLabelTop}>Chart type</span>
                <div className={styles.chartTypeRow}>
                    {CHART_TYPE_OPTIONS.map(([chartType, Icon, label]) => {
                        const isActive = sSelectedChartType === chartType;

                        return (
                            <Button
                                key={chartType}
                                className={`${styles.chartTypeButton} ${isActive ? styles.chartTypeButtonActive : ''}`}
                                variant="ghost"
                                size="md"
                                onClick={() => setSelectedChartType(chartType)}
                                active={isActive}
                            >
                                <span className={styles.chartTypeButtonContent}>
                                    <Icon size={26} />
                                    <span className={styles.chartTypeLabel}>
                                        {label}
                                        {isActive ? <Check size={14} /> : null}
                                    </span>
                                </span>
                            </Button>
                        );
                    })}
                </div>
            </div>

            <SeriesEditor
                seriesList={sSelectedTags}
                rollupTableList={rollupTableList}
                onFooterMessageChange={setFooterMessage}
                onSeriesListChange={setSelectedTags}
            />
        </SeriesModalFrame>
    );
}
