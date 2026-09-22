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
} from '../rangeExpression/intervalResolver';
import type { AxisRange } from '../rangeExpression/rangeModel';
import { shiftRange } from '../rangeExpression/rangeArithmetic';
import {
    buildOverlapChartOption,
    formatOverlapElapsedDurationLabel,
    type OverlapChartSeriesGroup,
    type OverlapPanelInput,
} from './overlapModel';
import { useOverlapData } from './useOverlapData';
import { Inline, Stack, Surface, Text } from '../ui/Presentation';
import controls from '../ui/Controls.module.scss';

export default function OverlapModal({
    initialPanels,
    isNumericXAxis,
    includeZeroInYAxisRange,
    onClose,
}: OverlapModalProps): JSX.Element {
    const {
        seriesGroups,
        isLoading,
        loadError,
        refreshOverlapData,
        shiftPanelRange,
    } = useOverlapData(initialPanels);

    const option = buildOverlapChartOption(
        seriesGroups,
        includeZeroInYAxisRange,
        isNumericXAxis,
    );

    return (
        <Modal.Root
            data-testid="tag-analyzer-overlap-dialog"
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
                <Modal.Close data-testid="tag-analyzer-overlap-close" />
            </Modal.Header>
            <Modal.Body>
                <Page.ContentBlock pHoverNone>
                    <Button
                        data-testid="tag-analyzer-overlap-refresh"
                        variant="secondary"
                        size="xsm"
                        icon={<Refresh size={12} />}
                        disabled={isLoading}
                        onClick={refreshOverlapData}
                        isToolTip
                        toolTipContent="Refresh data"
                        aria-label="Refresh data"
                    />
                    <div
                        data-testid="tag-analyzer-overlap-chart"
                        role="region"
                        aria-label="Overlap chart"
                        aria-busy={isLoading}
                    >
                        {isLoading ? (
                            <Page.ContentText pContent="Loading overlap data..." />
                        ) : loadError ? (
                            <Page.ContentText pContent={loadError} />
                        ) : !option ? (
                            <Page.ContentText pContent="No overlap data." />
                        ) : (
                            <ReactECharts
                                data-testid="viewport-surface"
                                option={option}
                                notMerge
                                lazyUpdate
                                style={{ width: '100%', height: 300 }}
                                opts={{ renderer: 'canvas' }}
                            />
                        )}
                    </div>
                    <Stack gap={8} className="overlap-modal__shift-list">
                        {seriesGroups.map((seriesGroup) => (
                            <OverlapPanelRow
                                key={seriesGroup.panelKey}
                                seriesGroup={seriesGroup}
                                isNumericXAxis={isNumericXAxis}
                                onShiftRange={shiftPanelRange}
                            />
                        ))}
                    </Stack>
                </Page.ContentBlock>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel data-testid="close-button">Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

// -------------------- Local --------------------

const OVERLAP_SHIFT_UNIT_OPTIONS = [
    { label: 'ms', value: TimeUnit.Millisecond, testId: 'tag-analyzer-overlap-shift-unit-millisecond' },
    { label: 'sec', value: TimeUnit.Second, testId: 'tag-analyzer-overlap-shift-unit-sec' },
    { label: 'min', value: TimeUnit.Minute, testId: 'tag-analyzer-overlap-shift-unit-min' },
    { label: 'hour', value: TimeUnit.Hour, testId: 'tag-analyzer-overlap-shift-unit-hour' },
    { label: 'day', value: TimeUnit.Day, testId: 'tag-analyzer-overlap-shift-unit-day' },
];
const OVERLAP_SHIFT_ERROR_MESSAGE = 'Shift amount must be 0 or greater.';

type OverlapModalProps = {
    initialPanels: OverlapPanelInput[];
    isNumericXAxis: boolean;
    includeZeroInYAxisRange: boolean;
    onClose: () => void;
};

function OverlapPanelRow({
    seriesGroup,
    isNumericXAxis,
    onShiftRange,
}: {
    seriesGroup: OverlapChartSeriesGroup;
    isNumericXAxis: boolean;
    onShiftRange: (panelKey: string, delta: number) => void;
}): JSX.Element {
    const [shiftAmount, setShiftAmount] = useState('1');
    const [shiftUnit, setShiftUnit] = useState(TimeUnit.Second);

    function shiftPanelRange(direction: -1 | 1): void {
        const amount = Number(shiftAmount);
        const delta = (isNumericXAxis
            ? amount
            : getTimeUnitMilliseconds(shiftUnit, amount)) * direction;
        if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(delta)) {
            Toast.error(OVERLAP_SHIFT_ERROR_MESSAGE, undefined);
            return;
        }
        if (delta === 0) return;

        if (!Number.isFinite(seriesGroup.shiftValue + delta)) {
            Toast.error(OVERLAP_SHIFT_ERROR_MESSAGE, undefined);
            return;
        }
        onShiftRange(seriesGroup.panelKey, delta);
    }

    return (
        <Surface variant="inset" density="compact"
            className="overlap-modal__shift-row"
            data-testid={`tag-analyzer-overlap-panel-${encodeURIComponent(seriesGroup.panelKey)}`}
        >
            <div className="overlap-modal__shift-text">
                <Text variant="caption" tone="default" weight="semibold" truncate>
                    {seriesGroup.name}
                </Text>
                <Text variant="caption" tone="secondary">Original</Text>
                <Text variant="caption" tone="secondary" truncate
                    data-testid="original-range"
                >
                    {formatOverlapRange(
                        seriesGroup.sourceRange,
                        isNumericXAxis,
                        false,
                    )}
                </Text>
                <Text variant="caption" tone="secondary">Altered</Text>
                <Text variant="caption" tone="secondary" truncate
                    data-testid="altered-range"
                >
                    {formatOverlapRange(
                        shiftRange(seriesGroup.alignedRange, seriesGroup.shiftValue),
                        isNumericXAxis,
                        true,
                    )}
                </Text>
            </div>
            <Inline gap={4}>
                <Button
                    data-testid="shift-left"
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronLeft size={14} />}
                    onClick={() => shiftPanelRange(-1)}
                    isToolTip
                    toolTipContent="Shift altered range left"
                    aria-label={`Shift altered range left for ${seriesGroup.name}`}
                />
                <Input
                    data-testid="shift-amount"
                    aria-label={`Shift amount for ${seriesGroup.name}`}
                    type="number"
                    min={0}
                    step="any"
                    size="sm"
                    value={shiftAmount}
                    onChange={(event) => setShiftAmount(event.target.value)}
                    style={{ width: 88 }}
                />
                {!isNumericXAxis && (
                    <Dropdown.Root
                        options={OVERLAP_SHIFT_UNIT_OPTIONS}
                        value={shiftUnit}
                        onChange={(unit) => setShiftUnit(unit as TimeUnit)}
                        style={{ width: 72 }}
                    >
                        <Dropdown.Trigger data-testid="shift-unit" className={controls.control} />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                )}
                <Button
                    data-testid="shift-right"
                    variant="secondary"
                    size="xsm"
                    icon={<VscChevronRight size={14} />}
                    onClick={() => shiftPanelRange(1)}
                    isToolTip
                    toolTipContent="Shift altered range right"
                    aria-label={`Shift altered range right for ${seriesGroup.name}`}
                />
            </Inline>
        </Surface>
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

    const { start, end } = formatAxisRange(range, isNumericXAxis);
    return `${start} ~ ${end}`;
}
