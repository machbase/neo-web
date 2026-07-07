import { useState, type CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
    BiSolidChart,
    Check,
    MdOutlineStackedLineChart,
    VscGraphLine,
    VscGraphScatter,
} from '@/assets/icons/Icon';
import { Button, Input } from '@/design-system/components';
import { Modal } from '@/design-system/components/Modal';
import {
    DEFAULT_NEW_PANEL_TITLE,
    createNewPanelInfo,
} from '../../domain/panel/createPanelInfo';
import type {
    PanelEChartType,
    PanelInfo,
} from '../../domain/panel/PanelInfo';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import type { RollupTableMap } from '../../fetch/panelData/PanelDataFetchTypes';
import { CreateNewPanelSeriesEditor } from './CreateNewPanelSeriesEditor';
import styles from './CreateNewPanel.module.scss';

const CHART_TYPE_OPTIONS = [
    ['Zone', MdOutlineStackedLineChart, 'Zone'],
    ['Dot', VscGraphScatter, 'Scatter'],
    ['Line', VscGraphLine, 'Line'],
] as const satisfies ReadonlyArray<readonly [PanelEChartType, IconType, string]>;

const CHART_TYPE_CARD_STYLE = {
    flex: 1,
    height: 76,
} satisfies CSSProperties;

const CHART_TYPE_CARD_ACTIVE_STYLE = {
    ...CHART_TYPE_CARD_STYLE,
    borderColor: '#006cd2',
} satisfies CSSProperties;

function CreatePanelModal({
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

    function applyPanel(): void {
        onCreatePanel(createNewPanelInfo(
            sSelectedTags,
            sChartTitle,
            sSelectedChartType,
        ));
        onClose();
    }

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            style={{ maxWidth: '700px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <span className={styles.titleIcon}>
                        <BiSolidChart />
                    </span>
                    New Chart
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div className={styles.panelStack}>
                    <Input
                        label="Chart name"
                        value={sChartTitle}
                        onChange={(event) => setChartTitle(event.target.value)}
                        labelPosition="top"
                        fullWidth
                        size="md"
                    />

                    <ChartTypeSelector
                        selectedChartType={sSelectedChartType}
                        onSelectChartType={setSelectedChartType}
                    />

                    <CreateNewPanelSeriesEditor
                        seriesList={sSelectedTags}
                        rollupTableList={rollupTableList}
                        onSeriesListChange={setSelectedTags}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Cancel</Modal.Cancel>
                <Modal.Confirm onClick={applyPanel}>Apply</Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
}

function ChartTypeSelector({
    selectedChartType,
    onSelectChartType,
}: {
    selectedChartType: PanelEChartType;
    onSelectChartType: (chartType: PanelEChartType) => void;
}) {
    return (
        <div className={styles.chartTypeSection}>
            <label className={styles.sectionLabel}>Chart type</label>
            <div className={styles.chartTypeRow}>
                {CHART_TYPE_OPTIONS.map(([chartType, Icon, label]) => {
                    const sIsActive = selectedChartType === chartType;

                    return (
                        <Button
                            key={chartType}
                            className={`${styles.chartTypeButton} ${sIsActive ? styles.chartTypeButtonActive : ''}`}
                            variant="ghost"
                            size="md"
                            style={
                                sIsActive
                                    ? CHART_TYPE_CARD_ACTIVE_STYLE
                                    : CHART_TYPE_CARD_STYLE
                            }
                            onClick={() => onSelectChartType(chartType)}
                            active={sIsActive}
                        >
                            <span className={styles.chartTypeButtonContent}>
                                <Icon size={26} />
                                <span className={styles.chartTypeLabel}>
                                    {label}
                                    {sIsActive ? <Check size={14} /> : null}
                                </span>
                            </span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

export default CreatePanelModal;
