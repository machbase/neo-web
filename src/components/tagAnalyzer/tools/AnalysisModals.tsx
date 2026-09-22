import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Close, LineChart, Play } from '@/assets/icons/Icon';
import { Spinner } from '@/components/spinner/Spinner';
import { Alert, Button, Dropdown, Input, Modal, Toast } from '@/design-system/components';
import { ShowVisualization } from '@/components/tql/ShowVisualization';
import {
    formatAxisPointer,
    formatAxisRange,
    formatAxisSpan,
} from '../format/axisFormat';
import {
    formatCompactNumber,
} from '../format/numericFormat';
import { formatTimeUnitShortCode } from '../rangeExpression/expressionFormat';
import {
    getTimeUnitMilliseconds,
    TimeUnit,
} from '../rangeExpression/intervalResolver';
import type { AxisRange } from '../rangeExpression/rangeModel';
import type { PanelSeriesDefinition } from '../seriesModel';
import PanelPopover from '../ui/PanelPopover';
import {
    FFT_MINIMUM_SAMPLE_COUNT,
    type FFTSelectionPayload,
    type FFTSeriesSummary,
} from './analysisModel';

import { fftApi, type FftChartData } from '../api/fftApi';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';
import { Inline, Stack, Text } from '../ui/Presentation';
import styles from './AnalysisModals.module.scss';
import controls from '../ui/Controls.module.scss';

export function SelectionSummaryPopover({
    selection,
    position,
    isNumericXAxis,
    isRaw,
    onClose,
}: {
    selection: FFTSelectionPayload;
    position: { x: number; y: number };
    isNumericXAxis: boolean;
    isRaw: boolean;
    onClose: () => void;
}) {
    const [isFftOpen, setFftOpen] = useState(false);
    const sFftChartData = useFftChartData();
    const sFftUnavailableReason = !isRaw
        ? 'FFT is only allowed during raw mode'
        : isNumericXAxis
          ? 'Numeric cannot be used to generate FFT.'
          : sFftChartData.isLoading
            ? 'Wait for the current FFT request to finish.'
          : undefined;

    useEffect(() => {
        if (!isRaw) setFftOpen(false);
    }, [isRaw]);

    if (isFftOpen && isRaw) {
        return (
            <FFTModal
                seriesSummaries={selection.seriesSummaries}
                start={selection.start}
                end={selection.end}
                isNumericXAxis={isNumericXAxis}
                fftChartData={sFftChartData}
                onClose={() => setFftOpen(false)}
            />
        );
    }

    return (
        <PanelPopover
            data-testid="tag-analyzer-selection-summary"
            title="Selection Summary"
            position={position}
            onClose={onClose}
            closeOnScroll={false}
            size="compact"
            outsideCloseIgnoreSelector=".panel-header"
            headerAction={(
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    icon={<Close size={16} />}
                    aria-label="Close selection summary"
                    data-testid="close"
                />
            )}
        >
            <Stack gap={24}>
                <Stack gap={12}>
                    <Text as="div" variant="body" tone="muted">
                        {formatAxisPointer(selection.start, isNumericXAxis)}{' ~ '}
                        {formatAxisPointer(selection.end, isNumericXAxis)}
                    </Text>
                    <Inline justify="center">
                        <Text variant="body" tone="muted">
                            {`( ${formatAxisSpan(selection.start, selection.end, isNumericXAxis)} )`}
                        </Text>
                    </Inline>
                </Stack>
                <div className={styles.selectionGrid}>
                    {SUMMARY_FIELD_LABELS.map((label) => (
                        <Text variant="label" tone="muted" key={label}>{label}</Text>
                    ))}
                    {selection.seriesSummaries.flatMap((item) => (
                        [item.series.sourceTagName, item.min, item.max, item.avg].map((value, index) => (
                            <Text
                                key={`${item.series.key}:${SUMMARY_FIELD_LABELS[index]}`}
                                variant="body"
                                data-numeric={index > 0 || undefined}
                            >
                                {value}
                            </Text>
                        ))
                    ))}
                </div>
                <div title={sFftUnavailableReason}>
                    <Button
                        data-testid="tag-analyzer-selection-open-fft"
                        size="sm"
                        variant="secondary"
                        disabled={sFftUnavailableReason !== undefined}
                        onClick={() => {
                            if (!sFftUnavailableReason) setFftOpen(true);
                        }}
                        icon={<LineChart size={16} />}
                        fullWidth
                    >
                        Open FFT chart
                    </Button>
                </div>
            </Stack>
        </PanelPopover>
    );
}

// -------------------- Local --------------------

const FFT_INTERVAL_OPTIONS = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
].map((unit) => ({
    value: unit,
    label: formatTimeUnitShortCode(unit),
    testId: `tag-analyzer-fft-interval-unit-option-${unit}`,
}));
const DEFAULT_FFT_APPLIED_VALUES = {
    minHz: 0,
    maxHz: 0,
    intervalMs: 100,
};

type FFTModalProps = FFTSelectionPayload & {
    isNumericXAxis: boolean;
    fftChartData: FftChartDataController;
    onClose: () => void;
};
type FftLoadTask = {
    id: number;
    args: {
        series: PanelSeriesDefinition;
        range: AxisRange;
        minHz: number;
        maxHz: number;
        intervalMs?: number;
    };
};
type FftChartDataController = {
    chartData: FftChartData | null;
    isLoading: boolean;
    loadChartData: (
        series: PanelSeriesDefinition,
        range: AxisRange,
        minHz: number,
        maxHz: number,
        intervalMs?: number,
    ) => void;
};
function FFTModal({
    seriesSummaries,
    start,
    end,
    isNumericXAxis,
    fftChartData,
    onClose,
}: FFTModalProps) {
    const [sSelectedInfo, setSelectedInfo] = useState(seriesSummaries[0]);
    const [sIsChart2D, setIsChart2D] = useState(true);
    const [sInterval, setInterval] = useState('100');
    const [sIntervalUnit, setIntervalUnit] = useState<TimeUnit>(TimeUnit.Millisecond);
    const [sMinHz, setMinHz] = useState('0');
    const [sMaxHz, setMaxHz] = useState('0');
    const [sFftWarning, setFftWarning] = useState<string>();
    const sAppliedValuesRef = useRef({ ...DEFAULT_FFT_APPLIED_VALUES });
    const {
        chartData: sChartData,
        isLoading: sIsLoading,
        loadChartData,
    } = fftChartData;
    const sFormattedRange = isNumericXAxis
        ? {
              start: formatCompactNumber(start),
              end: formatCompactNumber(end),
          }
        : formatAxisRange({ start, end }, false);
    const rejectNumeric3dFft = (): boolean => {
        if (!isNumericXAxis) return false;

        Toast.warning(
            '3D FFT is only available for datetime x-axis panels.',
            undefined,
        );
        return true;
    };

    useEffect(() => {
        const sInitialSummary = seriesSummaries[0];
        setSelectedInfo(sInitialSummary);
        loadChartData(sInitialSummary.series, { start, end }, 0, 0);
    }, [end, loadChartData, seriesSummaries, start]);

    const loadSelectedFft = (
        summary: FFTSeriesSummary,
        isChart2D: boolean,
        values = sAppliedValuesRef.current,
    ): void => {
        const sWarning = isChart2D
            ? undefined
            : getFftIntervalWarning(summary, values.intervalMs);
        setFftWarning(sWarning);
        if (sWarning !== undefined) return;

        loadChartData(
            summary.series,
            { start, end },
            values.minHz,
            values.maxHz,
            isChart2D ? undefined : values.intervalMs,
        );
    };

    const handleSelectedSeries = (value: string): void => {
        const sSelectedSummary = seriesSummaries.find(
            (summary) => summary.series.key === value,
        );
        if (!sSelectedSummary) return;

        setSelectedInfo(sSelectedSummary);
        loadSelectedFft(sSelectedSummary, sIsChart2D);
    };

    function handleChartDimension(sNextIsChart2D: boolean): void {
        if (sNextIsChart2D === sIsChart2D) return;
        if (!sNextIsChart2D && rejectNumeric3dFft()) return;

        setIsChart2D(sNextIsChart2D);
        loadSelectedFft(sSelectedInfo, sNextIsChart2D);
    }

    const handleApplyInputs = (): void => {
        const sMinHzValue = parseNonNegativeNumber(sMinHz);
        const sMaxHzValue = parseNonNegativeNumber(sMaxHz);
        if (sMinHzValue === undefined || sMaxHzValue === undefined) {
            Toast.error('FFT frequencies must be finite, non-negative numbers.', {
                testId: 'tag-analyzer-fft-frequency-error',
            });
            return;
        }
        if (sMinHzValue > sMaxHzValue) {
            Toast.error('Min Hz cannot be greater than Max Hz.', {
                testId: 'tag-analyzer-fft-frequency-range-error',
            });
            return;
        }

        let sIntervalMs = sAppliedValuesRef.current.intervalMs;
        if (!sIsChart2D) {
            if (rejectNumeric3dFft()) return;

            const sIntervalValue = Number(sInterval);
            if (!Number.isFinite(sIntervalValue) || sIntervalValue <= 0) {
                Toast.error('FFT interval must be a positive number.', {
                    testId: 'tag-analyzer-fft-interval-error',
                });
                return;
            }

            sIntervalMs = getTimeUnitMilliseconds(
                sIntervalUnit,
                sIntervalValue,
            );
            if (!Number.isFinite(sIntervalMs) || sIntervalMs <= 0) {
                Toast.error('FFT interval is outside the supported range.', {
                    testId: 'tag-analyzer-fft-interval-range-error',
                });
                return;
            }
        }

        const sAppliedValues = {
            minHz: sMinHzValue,
            maxHz: sMaxHzValue,
            intervalMs: sIntervalMs,
        };
        sAppliedValuesRef.current = sAppliedValues;
        setMinHz(String(sMinHzValue));
        setMaxHz(String(sMaxHzValue));
        loadSelectedFft(sSelectedInfo, sIsChart2D, sAppliedValues);
    };

    const handleSelectInterval = (value: string) => {
        const sSelectedUnit = FFT_INTERVAL_OPTIONS.find(
            (option) => option.value === value,
        )?.value;
        if (sSelectedUnit) {
            setIntervalUnit(sSelectedUnit);
        }
    };

    return (
        <Modal.Root
            data-testid="tag-analyzer-fft-dialog"
            isOpen
            onClose={onClose}
            size="lg"
            className={styles.fftModal}
        >
            <Modal.Header>
                <Modal.Title>
                    <LineChart size={16} /> <Text variant="title">FFT</Text>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body className={styles.fftBody}>
                <div className={styles.fftToolbar}>
                    <Stack as="fieldset" gap={8} className={styles.fftFieldset}>
                        <Text as="legend" variant="label" tone="muted">
                            Series
                        </Text>
                        <Dropdown.Root
                            options={seriesSummaries.map(({ series }) => ({
                                value: series.key,
                                label: series.alias || series.sourceTagName,
                                testId: `tag-analyzer-fft-series-option-${encodeURIComponent(series.sourceTagName)}`,
                            }))}
                            value={sSelectedInfo.series.key}
                            onChange={handleSelectedSeries}
                            disabled={sIsLoading}
                            placeholder="Select series"
                            fullWidth
                        >
                            <Dropdown.Trigger data-testid="tag-analyzer-fft-series" className={controls.control} />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Stack>

                    <Stack as="fieldset" gap={8} className={styles.fftFieldset}>
                        <Text as="legend" variant="label" tone="muted">
                            Chart dimension
                        </Text>
                        <Inline
                            gap={4}
                            className={styles.fftDimensionButtons}
                        >
                            <Button
                                data-testid="tag-analyzer-fft-2d"
                                className={controls.control}
                                type="button"
                                size="sm"
                                variant="secondary"
                                active={sIsChart2D}
                                disabled={sIsLoading}
                                aria-pressed={sIsChart2D}
                                aria-label="Show 2D FFT chart"
                                onClick={() => handleChartDimension(true)}
                            >
                                2D
                            </Button>
                            <Button
                                data-testid="tag-analyzer-fft-3d"
                                className={controls.control}
                                type="button"
                                size="sm"
                                variant="secondary"
                                active={!sIsChart2D}
                                disabled={isNumericXAxis || sIsLoading}
                                aria-pressed={!sIsChart2D}
                                aria-label="Show 3D FFT chart"
                                onClick={() => handleChartDimension(false)}
                            >
                                3D
                            </Button>
                        </Inline>
                    </Stack>
                </div>

                <Inline wrap align="end" gap={12}>
                    {[
                        { name: 'min', label: 'Min Hz', value: sMinHz, setValue: setMinHz },
                        { name: 'max', label: 'Max Hz', value: sMaxHz, setValue: setMaxHz },
                    ].map(({ name, label, value, setValue }) => (
                        <Input
                            key={name}
                            data-testid={`tag-analyzer-fft-${name}-hz`}
                            className={styles.fftFrequencyField}
                            label={label}
                            labelPosition="top"
                            type="number"
                            min={0}
                            step="any"
                            size="md"
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    ))}
                    {!sIsChart2D && (
                        <div className={styles.fftIntervalFields}>
                            <Input
                                data-testid="tag-analyzer-fft-interval"
                                label="Interval"
                                labelPosition="top"
                                type="number"
                                min={0}
                                step="any"
                                size="md"
                                value={sInterval}
                                onChange={(event) => setInterval(event.target.value)}
                            />
                            <Stack as="fieldset" gap={8} className={styles.fftFieldset}>
                                <Text as="legend" variant="label" tone="muted">Unit</Text>
                                <Dropdown.Root
                                    options={FFT_INTERVAL_OPTIONS}
                                    value={sIntervalUnit}
                                    onChange={handleSelectInterval}
                                    placeholder="Unit"
                                    fullWidth
                                >
                                    <Dropdown.Trigger data-testid="tag-analyzer-fft-interval-unit" className={controls.control} />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </Stack>
                        </div>
                    )}
                    <Button
                        data-testid="tag-analyzer-fft-apply"
                        className={`${controls.control} ${styles.fftApplyButton}`}
                        type="button"
                        size="sm"
                        variant="primary"
                        icon={<Play size={16} />}
                        disabled={sIsLoading}
                        onClick={handleApplyInputs}
                    >
                        Apply values
                    </Button>
                </Inline>

                <div
                    data-testid="tag-analyzer-fft-chart"
                    className={styles.fftChartArea}
                    role="region"
                    aria-label="FFT chart"
                    aria-busy={sIsLoading}
                >
                    {sIsLoading && (
                        <div className={styles.fftLoading}>
                            <Spinner />
                        </div>
                    )}
                    {!sIsLoading && sFftWarning && (
                        <div
                            data-testid="tag-analyzer-fft-warning"
                            className={styles.fftLoading}
                            role="alert"
                        >
                            <Alert
                                variant="warning"
                                title="Not enough samples per interval"
                                message={sFftWarning}
                            />
                        </div>
                    )}
                    {!sIsLoading && !sFftWarning && sChartData && (
                        <ShowVisualization pData={sChartData} pLoopMode={false} />
                    )}
                </div>
                <Inline as="dl" wrap align="baseline" gap={16}
                    data-testid="tag-analyzer-fft-summary"
                    className={styles.fftSelectionSummary}
                >
                    {[
                        ['Min', sSelectedInfo.min],
                        ['Max', sSelectedInfo.max],
                        ['Avg', sSelectedInfo.avg],
                    ].map(([label, value]) => (
                        <Inline
                            align="baseline"
                            gap={8}
                            key={label}
                            data-testid={`tag-analyzer-fft-summary-${label.toLowerCase()}`}
                            className={styles.fftSummaryItem}
                        >
                            <Text as="dt" variant="body" tone="subtle">{label}</Text>
                            <Text as="dd" variant="body" tone="default">{value}</Text>
                        </Inline>
                    ))}
                    <Inline
                        align="baseline"
                        gap={8}
                        data-testid="tag-analyzer-fft-summary-range"
                        className={`${styles.fftSummaryItem} ${styles.fftSummaryRange}`}
                    >
                        <Text as="dt" variant="body" tone="subtle">Selected range</Text>
                        <Text as="dd" variant="body" tone="default">
                            {`${sFormattedRange.start} ~ ${sFormattedRange.end}`}
                        </Text>
                    </Inline>
                </Inline>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel data-testid="tag-analyzer-fft-close">
                    Close
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}
function useFftChartData() {
    const [sChartData, setChartData] = useState<FftChartData | null>(null);
    const [sIsLoading, setIsLoading] = useState(false);
    const [sLoadTask, setLoadTask] = useState<FftLoadTask>();
    const sIsLoadingRef = useRef(false);

    useLatestAsyncRequest({
        enabled: sLoadTask !== undefined,
        requestKey: String(sLoadTask?.id ?? 0),
        fetch: (signal) => {
            const { series, range, minHz, maxHz, intervalMs } =
                sLoadTask!.args;
            return fftApi.fetchFftChartData(
                series,
                range,
                minHz,
                maxHz,
                intervalMs,
                signal,
            );
        },
        onSuccess: (chartData) => {
            sIsLoadingRef.current = false;
            setChartData(chartData);
            setIsLoading(false);
        },
        onError: () => {
            sIsLoadingRef.current = false;
            setChartData(null);
            setIsLoading(false);
            Toast.error('Failed to load FFT chart.', {
                testId: 'tag-analyzer-fft-load-error',
            });
        },
    });

    const loadChartData = useCallback((
        series: PanelSeriesDefinition,
        range: AxisRange,
        minHz: number,
        maxHz: number,
        intervalMs?: number,
    ): void => {
        if (sIsLoadingRef.current) return;

        sIsLoadingRef.current = true;
        setIsLoading(true);
        setLoadTask((currentTask) => ({
            id: (currentTask?.id ?? 0) + 1,
            args: { series, range, minHz, maxHz, intervalMs },
        }));
    }, []);

    return { chartData: sChartData, isLoading: sIsLoading, loadChartData };
}

function parseNonNegativeNumber(value: string): number | undefined {
    const sValue = Number(value);
    return Number.isFinite(sValue) && sValue >= 0 ? sValue : undefined;
}

function getFftIntervalWarning(
    summary: FFTSeriesSummary,
    intervalMs: number,
): string | undefined {
    if (summary.sampleTimestamps.length < FFT_MINIMUM_SAMPLE_COUNT) {
        return `3D FFT requires at least ${FFT_MINIMUM_SAMPLE_COUNT} samples in the selected range.`;
    }

    const sampleCountByBucket = new Map<number, number>();
    for (const timestamp of summary.sampleTimestamps) {
        const bucket = Math.trunc(timestamp / intervalMs);
        const sampleCount = (sampleCountByBucket.get(bucket) ?? 0) + 1;
        if (sampleCount >= FFT_MINIMUM_SAMPLE_COUNT) return undefined;
        sampleCountByBucket.set(bucket, sampleCount);
    }

    return `Every 3D FFT interval contains fewer than ${FFT_MINIMUM_SAMPLE_COUNT} samples. Increase the interval and apply again.`;
}

const SUMMARY_FIELD_LABELS = ['Name', 'Min', 'Max', 'Avg'] as const;
