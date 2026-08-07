import './OverlapModal.scss';
import ReactECharts from 'echarts-for-react';
import {
    MdOutlineStackedLineChart,
    Refresh,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { useState } from 'react';
import { Modal } from '@/design-system/components/Modal';
import { Button, Dropdown, Input, Page, Toast } from '@/design-system/components';
import { formatAxisRange } from '../format/axisFormat';
import {
    getTimeUnitMilliseconds,
    TimeUnit,
} from '../range/intervalResolver';
import type { AxisRange } from '../range/rangeModel';
import {
    buildOverlapChartOption,
    formatOverlapElapsedDurationLabel,
    getOverlapChartSeriesGroupRange,
    joinOverlapChartSeriesGroups,
    type OverlapChartSeriesGroup,
    type OverlapPanelInput,
} from './overlapModel';
import { useOverlapData } from './useOverlapData';

const OVERLAP_SHIFT_UNIT_OPTIONS = [
    { label: 'ms', value: TimeUnit.Millisecond },
    { label: 'sec', value: TimeUnit.Second },
    { label: 'min', value: TimeUnit.Minute },
    { label: 'hour', value: TimeUnit.Hour },
    { label: 'day', value: TimeUnit.Day },
];
const OVERLAP_SHIFT_ERROR_MESSAGE = 'Shift amount must be 0 or greater.';

type ShiftDirection = -1 | 1;

type OverlapModalProps = {
    initialPanels: OverlapPanelInput[];
    isNumericXAxis: boolean;
    includeZeroInYAxisRange: boolean;
    onClose: () => void;
};

export default function OverlapModal({
    initialPanels,
    isNumericXAxis,
    includeZeroInYAxisRange,
    onClose,
}: OverlapModalProps): JSX.Element {
    const {
        seriesGroups: sSeriesGroups,
        isLoading: sIsLoadingOverlapData,
        loadError: sOverlapLoadError,
        refreshOverlapData,
        shiftPanelRange,
    } = useOverlapData(initialPanels);

    const sSeriesData = joinOverlapChartSeriesGroups(sSeriesGroups);
    const sCanRenderChart = sSeriesData.some(({ data }) =>
        data.some(([, value]) => value !== null),
    );
    const sChartOption = buildOverlapChartOption(
        sSeriesData,
        includeZeroInYAxisRange,
        isNumericXAxis,
    );

    return (
        <Modal.Root
            isOpen={true}
            onClose={onClose}
            size="lg"
            style={{ height: 'auto', maxHeight: '80vh' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <MdOutlineStackedLineChart size={16} />
                    <span>Overlap Chart</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Page.ContentBlock pHoverNone>
                    <Button
                        variant="secondary"
                        size="xsm"
                        icon={<Refresh size={12} />}
                        disabled={sIsLoadingOverlapData}
                        onClick={refreshOverlapData}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div
                        role="region"
                        aria-label="Overlap chart"
                        aria-busy={sIsLoadingOverlapData}
                    >
                        {sIsLoadingOverlapData ? (
                            <Page.ContentText pContent="Loading overlap data..." />
                        ) : sOverlapLoadError ? (
                            <Page.ContentText pContent={sOverlapLoadError} />
                        ) : !sCanRenderChart ? (
                            <Page.ContentText pContent="No overlap data." />
                        ) : (
                            <ReactECharts
                                option={sChartOption}
                                notMerge
                                lazyUpdate
                                style={{ width: '100%', height: 300 }}
                                opts={{ renderer: 'canvas' }}
                            />
                        )}
                    </div>
                    <div className="overlap-modal__shift-list">
                        {sSeriesGroups.map((seriesGroup) => (
                            <OverlapPanelRow
                                key={seriesGroup.panelKey}
                                seriesGroup={seriesGroup}
                                isNumericXAxis={isNumericXAxis}
                                onShiftRange={shiftPanelRange}
                            />
                        ))}
                    </div>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

function OverlapPanelRow({
    seriesGroup,
    isNumericXAxis,
    onShiftRange,
}: {
    seriesGroup: OverlapChartSeriesGroup;
    isNumericXAxis: boolean;
    onShiftRange: (panelKey: string, delta: number) => void;
}): JSX.Element {
    const [sShiftAmount, setShiftAmount] = useState('1');
    const [sShiftUnit, setShiftUnit] = useState(TimeUnit.Second);
    const alteredRange = getOverlapChartSeriesGroupRange(seriesGroup);

    function shiftPanelRange(direction: ShiftDirection): void {
        const amount = Number(sShiftAmount);
        const offset = isNumericXAxis
            ? amount
            : getTimeUnitMilliseconds(sShiftUnit, amount);
        if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(offset)) {
            Toast.error(OVERLAP_SHIFT_ERROR_MESSAGE, undefined);
            return;
        }
        if (offset === 0) return;

        const delta = offset * direction;
        if (!Number.isFinite(seriesGroup.shiftValue + delta)) {
            Toast.error(OVERLAP_SHIFT_ERROR_MESSAGE, undefined);
            return;
        }
        onShiftRange(seriesGroup.panelKey, delta);
    }

    return (
        <div className="overlap-modal__shift-row">
            <div className="overlap-modal__shift-text">
                <strong className="overlap-modal__shift-title">
                    {seriesGroup.name}
                </strong>
                <span className="overlap-modal__shift-label">Original</span>
                <span className="overlap-modal__shift-value">
                    {formatOverlapRange(
                        seriesGroup.sourceRange,
                        isNumericXAxis,
                        false,
                    )}
                </span>
                <span className="overlap-modal__shift-label">Altered</span>
                <span className="overlap-modal__shift-value">
                    {formatOverlapRange(alteredRange, isNumericXAxis, true)}
                </span>
            </div>
            <div className="overlap-modal__shift-controls">
                <Button
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronLeft size={14} />}
                    onClick={() => shiftPanelRange(-1)}
                    isToolTip
                    toolTipContent="Shift altered range left"
                    aria-label={`Shift altered range left for ${seriesGroup.name}`}
                />
                <Input
                    aria-label={`Shift amount for ${seriesGroup.name}`}
                    type="number"
                    min={0}
                    step="any"
                    size="sm"
                    value={sShiftAmount}
                    onChange={(event) => setShiftAmount(event.target.value)}
                    style={{ width: 88 }}
                />
                {!isNumericXAxis && (
                    <Dropdown.Root
                        options={OVERLAP_SHIFT_UNIT_OPTIONS}
                        value={sShiftUnit}
                        onChange={(unit) => setShiftUnit(unit as TimeUnit)}
                        style={{ width: 72 }}
                    >
                        <Dropdown.Trigger
                            style={{ height: 28, minHeight: 28, fontSize: 12 }}
                        />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                )}
                <Button
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronRight size={14} />}
                    onClick={() => shiftPanelRange(1)}
                    isToolTip
                    toolTipContent="Shift altered range right"
                    aria-label={`Shift altered range right for ${seriesGroup.name}`}
                />
            </div>
        </div>
    );
}

function formatOverlapRange(
    range: AxisRange,
    isNumericXAxis: boolean,
    useElapsedTime: boolean,
): string {
    if (useElapsedTime && !isNumericXAxis) {
        return `${formatOverlapElapsedDurationLabel(
            range.start,
        )} ~ ${formatOverlapElapsedDurationLabel(range.end)}`;
    }

    const sFormattedRange = formatAxisRange(range, isNumericXAxis);
    return `${sFormattedRange.start} ~ ${sFormattedRange.end}`;
}
