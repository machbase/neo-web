import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Close, LineChart, Play } from '@/assets/icons/Icon';
import { Spinner } from '@/components/spinner/Spinner';
import { Button, Dropdown, Input, Modal, Page, Toast } from '@/design-system/components';
import { ShowVisualization } from '@/components/tql/ShowVisualization';
import {
    formatAxisPointerLabel,
    formatRangeSpanLabel,
} from '../range/format/rangeFormat';
import { formatNumericAxisLabel } from '../range/format/numericRangeFormat';
import { formatTimeRange } from '../range/format/timeRangeFormat';
import {
    formatTimeUnitShortCode,
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
    TimeUnit,
    type AxisRange,
} from '../range/rangeModel';
import type { PanelSeriesDefinition } from '../seriesModel';
import type { ChartSeriesData } from '../chart/chartData';
import type { FFTSelectionPayload } from '../panel/panelInteraction';
import PanelPopover from '../components/PanelPopover';

import { fftApi, type FftChartData } from '../api/fftApi';
import { useLatestAsyncRequest } from '../hooks/useLatestAsyncRequest';
import styles from './AnalysisModals.module.scss';

type SelectedRangeSeriesSummary = FFTSelectionPayload['seriesSummaries'][number];

const FFT_INTERVAL_OPTIONS = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
].map((unit) => ({
    value: unit,
    label: formatTimeUnitShortCode(unit),
}));
const DEFAULT_FFT_APPLIED_VALUES = {
    minHz: 0,
    maxHz: 0,
    intervalMs: 100,
};

type FFTModalProps = FFTSelectionPayload & {
    isNumericXAxis: boolean;
    onClose: () => void;
};
type FftLoadTask = { id: number; args: Parameters<typeof fftApi.fetchFftChartData> };
function FFTModal({
    seriesSummaries,
    startTime,
    endTime,
    isNumericXAxis,
    onClose,
}: FFTModalProps) {
    const [sSelectedInfo, setSelectedInfo] = useState<SelectedRangeSeriesSummary | null>(null);
    const [sIsChart2D, setIsChart2D] = useState(true);
    const [sInterval, setInterval] = useState('100');
    const [sIntervalUnit, setIntervalUnit] = useState<TimeUnit>(TimeUnit.Millisecond);
    const [sMinHz, setMinHz] = useState('0');
    const [sMaxHz, setMaxHz] = useState('0');
    const sAppliedValuesRef = useRef({ ...DEFAULT_FFT_APPLIED_VALUES });
    const {
        chartData: sChartData,
        isLoading: sIsLoading,
        loadChartData,
    } = useFftChartData();
    const sFormattedRange = isNumericXAxis
        ? {
              start: formatNumericAxisLabel(startTime),
              end: formatNumericAxisLabel(endTime),
          }
        : formatTimeRange({ startTime, endTime });
    const sRangeLabel = `${sFormattedRange.start} ~ ${sFormattedRange.end}`;
    const sDropdownOptions = seriesSummaries.map((summary) => ({
        value: summary.series.key,
        label: summary.series.alias || summary.series.sourceTagName,
    }));
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
        if (sInitialSummary === undefined) {
            return;
        }

        setSelectedInfo(sInitialSummary);
        loadChartData(sInitialSummary.series, { startTime, endTime }, 0, 0);
    }, [endTime, loadChartData, seriesSummaries, startTime]);

    const loadSelectedFft = (
        summary: SelectedRangeSeriesSummary,
        isChart2D: boolean,
        values = sAppliedValuesRef.current,
    ): void => {
        const sArgs = [
            summary.series,
            { startTime, endTime },
            values.minHz,
            values.maxHz,
        ] as const;

        if (isChart2D) {
            loadChartData(...sArgs);
            return;
        }
        loadChartData(...sArgs, values.intervalMs);
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
        if (sSelectedInfo) loadSelectedFft(sSelectedInfo, sNextIsChart2D);
    }

    const handleApplyInputs = (): void => {
        if (!sSelectedInfo) {
            Toast.error('Please select a series.');
            return;
        }

        const sMinHzValue = parseNonNegativeNumber(sMinHz);
        const sMaxHzValue = parseNonNegativeNumber(sMaxHz);
        if (sMinHzValue === undefined || sMaxHzValue === undefined) {
            Toast.error('FFT frequencies must be finite, non-negative numbers.');
            return;
        }
        if (sMinHzValue > sMaxHzValue) {
            Toast.error('Min Hz cannot be greater than Max Hz.');
            return;
        }

        let sIntervalMs = sAppliedValuesRef.current.intervalMs;
        if (!sIsChart2D) {
            if (rejectNumeric3dFft()) return;

            const sIntervalValue = Number(sInterval);
            if (!Number.isFinite(sIntervalValue) || sIntervalValue <= 0) {
                Toast.error('FFT interval must be a positive number.');
                return;
            }

            sIntervalMs = getTimeUnitMilliseconds(
                sIntervalUnit,
                sIntervalValue,
            );
            if (!Number.isFinite(sIntervalMs) || sIntervalMs <= 0) {
                Toast.error('FFT interval is outside the supported range.');
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
        const sNormalizedUnit = normalizeTimeUnit(value);
        if (sNormalizedUnit) {
            setIntervalUnit(sNormalizedUnit);
        }
    };

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            size="lg"
            className={styles.fftModal}
        >
            <Modal.Header>
                <Modal.Title>
                    <LineChart size={16} /> FFT
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body className={styles.fftBody}>
                <div className={styles.fftToolbar}>
                    <fieldset className={styles.fftFieldset}>
                        <legend className={styles.fftControlLabel}>
                            Series
                        </legend>
                        <Dropdown.Root
                            options={sDropdownOptions}
                            value={sSelectedInfo?.series.key}
                            onChange={handleSelectedSeries}
                            placeholder="Select series"
                            fullWidth
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </fieldset>

                    <fieldset className={styles.fftFieldset}>
                        <legend className={styles.fftControlLabel}>
                            Chart dimension
                        </legend>
                        <div
                            className={styles.fftDimensionButtons}
                        >
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                active={sIsChart2D}
                                aria-pressed={sIsChart2D}
                                aria-label="Show 2D FFT chart"
                                onClick={() => handleChartDimension(true)}
                            >
                                2D
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                active={!sIsChart2D}
                                disabled={isNumericXAxis}
                                aria-pressed={!sIsChart2D}
                                aria-label="Show 3D FFT chart"
                                onClick={() => handleChartDimension(false)}
                            >
                                3D
                            </Button>
                        </div>
                    </fieldset>
                </div>

                <div
                    className={styles.fftInputs}
                >
                    <div className={styles.fftInputRow}>
                        <Input
                            className={styles.fftFrequencyField}
                            label="Min Hz"
                            labelPosition="top"
                            type="number"
                            min={0}
                            step="any"
                            size="md"
                            value={sMinHz}
                            onChange={(event) => setMinHz(event.target.value)}
                        />
                        <Input
                            className={styles.fftFrequencyField}
                            label="Max Hz"
                            labelPosition="top"
                            type="number"
                            min={0}
                            step="any"
                            size="md"
                            value={sMaxHz}
                            onChange={(event) => setMaxHz(event.target.value)}
                        />
                        {!sIsChart2D && (
                            <div className={styles.fftIntervalFields}>
                                <Input
                                    label="Interval"
                                    labelPosition="top"
                                    type="number"
                                    min={0}
                                    step="any"
                                    size="md"
                                    value={sInterval}
                                    onChange={(event) =>
                                        setInterval(event.target.value)
                                    }
                                />
                                <fieldset className={styles.fftFieldset}>
                                    <legend className={styles.fftControlLabel}>
                                        Unit
                                    </legend>
                                    <Dropdown.Root
                                        options={FFT_INTERVAL_OPTIONS}
                                        value={sIntervalUnit}
                                        onChange={handleSelectInterval}
                                        placeholder="Unit"
                                        fullWidth
                                    >
                                        <Dropdown.Trigger />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                </fieldset>
                            </div>
                        )}
                        <Button
                            className={styles.fftApplyButton}
                            type="button"
                            size="sm"
                            variant="primary"
                            icon={<Play size={16} />}
                            onClick={handleApplyInputs}
                        >
                            Apply values
                        </Button>
                    </div>
                </div>

                <div
                    className={styles.fftChartArea}
                    aria-busy={sIsLoading}
                >
                    {sIsLoading && (
                        <div className={styles.fftLoading}>
                            <Spinner />
                        </div>
                    )}
                    {!sIsLoading && sChartData && (
                        <ShowVisualization pData={sChartData} pLoopMode={false} />
                    )}
                </div>
                <dl className={styles.fftSelectionSummary}>
                    {[
                        ['Min', sSelectedInfo?.min ?? '—'],
                        ['Max', sSelectedInfo?.max ?? '—'],
                        ['Avg', sSelectedInfo?.avg ?? '—'],
                    ].map(([label, value]) => (
                        <div key={label} className={styles.fftSummaryItem}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                    <div
                        className={`${styles.fftSummaryItem} ${styles.fftSummaryRange}`}
                    >
                        <dt>Selected range</dt>
                        <dd>{sRangeLabel}</dd>
                    </div>
                </dl>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel>Close</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
}

function useFftChartData() {
    const [sChartData, setChartData] = useState<FftChartData | null>(null);
    const [sIsLoading, setIsLoading] = useState(false);
    const [sLoadTask, setLoadTask] = useState<FftLoadTask>();

    useLatestAsyncRequest({
        enabled: sLoadTask !== undefined,
        requestKey: String(sLoadTask?.id ?? 0),
        fetch: () => fftApi.fetchFftChartData(...sLoadTask!.args),
        onSuccess: (chartData) => {
            setChartData(chartData);
            setIsLoading(false);
        },
        onError: () => {
            setChartData(null);
            setIsLoading(false);
            Toast.error('Failed to load FFT chart.');
        },
    });

    const loadChartData = useCallback((...args: FftLoadTask['args']): void => {
        setIsLoading(true);
        setLoadTask((currentTask) => ({ id: (currentTask?.id ?? 0) + 1, args }));
    }, []);

    return { chartData: sChartData, isLoading: sIsLoading, loadChartData };
}

function parseNonNegativeNumber(value: string): number | undefined {
    const sValue = value.trim() === '' ? 0 : Number(value);
    return Number.isFinite(sValue) && sValue >= 0 ? sValue : undefined;
}

const SUMMARY_FIELD_LABELS = ['Name', 'Min', 'Max', 'Avg'] as const;

export function SelectionSummaryPopover({
    selection,
    position,
    isNumericXAxis,
    onClose,
}: {
    selection: FFTSelectionPayload;
    position: { x: number; y: number };
    isNumericXAxis: boolean;
    onClose: () => void;
}) {
    const [isFftOpen, setFftOpen] = useState(false);

    if (isFftOpen) {
        return (
            <FFTModal
                seriesSummaries={selection.seriesSummaries}
                startTime={selection.startTime}
                endTime={selection.endTime}
                isNumericXAxis={isNumericXAxis}
                onClose={() => setFftOpen(false)}
            />
        );
    }

    return (
        <PanelPopover
            title="Selection Summary"
            position={position}
            onClose={onClose}
            size="compact"
            outsideCloseIgnoreSelector=".panel-header"
            headerAction={(
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    icon={<Close size={16} />}
                    aria-label="Close selection summary"
                />
            )}
        >
            <Page.ContentDesc>
                {formatAxisPointerLabel(selection.startTime, isNumericXAxis)}{' '}
                ~{' '}
                {formatAxisPointerLabel(selection.endTime, isNumericXAxis)}
            </Page.ContentDesc>
            <Page.DpRow style={{ justifyContent: 'center' }}>
                <Page.ContentDesc>
                    {`( ${formatRangeSpanLabel(
                        selection.startTime,
                        selection.endTime,
                        isNumericXAxis,
                    )} )`}
                </Page.ContentDesc>
            </Page.DpRow>
            <Page.Space />
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(88px, 1.4fr) repeat(3, minmax(72px, 1fr))',
                    gap: '6px 10px',
                    alignItems: 'baseline',
                }}
            >
                {SUMMARY_FIELD_LABELS.map((label) => (
                    <Page.ContentDesc key={label}>
                        {label}
                    </Page.ContentDesc>
                ))}
                {selection.seriesSummaries.map((item) => {
                    const sValues = [
                        item.series.sourceTagName,
                        item.min,
                        item.max,
                        item.avg,
                    ];

                    return sValues.map((value, index) => (
                        <Page.ContentText
                            key={`${item.series.key}:${SUMMARY_FIELD_LABELS[index]}`}
                            pContent={value}
                            style={{
                                minWidth: 0,
                                overflowWrap: 'anywhere',
                                textAlign: index === 0 ? 'left' : 'right',
                            }}
                        />
                    ));
                })}
            </div>
            <Page.Space />
            <div
                title={isNumericXAxis ? 'Numeric cannot be used to generate FFT.' : undefined}
            >
                <Button
                    size="sm"
                    variant="secondary"
                    disabled={isNumericXAxis}
                    onClick={() => setFftOpen(true)}
                    icon={<LineChart size={16} />}
                    fullWidth
                >
                    Open FFT chart
                </Button>
            </div>
        </PanelPopover>
    );
}

// Kept with the analysis UI so selection semantics have a single owner.
// eslint-disable-next-line react-refresh/only-export-components
export function buildSelectionSummaryPayload(
    selectionRange: AxisRange,
    chartData: ChartSeriesData[],
    seriesList: PanelSeriesDefinition[],
): FFTSelectionPayload | undefined {
    const sSeriesSummaries = buildSeriesSummaryRows(
        chartData.map((series) => series.data),
        seriesList,
        selectionRange.startTime,
        selectionRange.endTime,
    );

    if (sSeriesSummaries.length === 0) return undefined;
    return { ...selectionRange, seriesSummaries: sSeriesSummaries };
}

function buildSeriesSummaryRows(
    seriesDataList: Array<ChartSeriesData['data']>,
    seriesList: PanelSeriesDefinition[],
    startTime: number,
    endTime: number,
): SelectedRangeSeriesSummary[] {
    if (seriesDataList.length !== seriesList.length) {
        throw new Error(
            `Brush selection series mismatch: ${seriesDataList.length} chart series for ${seriesList.length} panel series.`,
        );
    }

    return seriesDataList.flatMap((seriesData, index) => {
        const sSeriesConfig = seriesList[index];
        if (sSeriesConfig === undefined) {
            throw new Error(`Missing series config for chart data index ${index}.`);
        }

        let sValueCount = 0;
        let sTotalValue = 0;
        let sMinimumValue = Infinity;
        let sMaximumValue = -Infinity;
        for (const [timestamp, value] of seriesData) {
            if (timestamp < startTime || timestamp > endTime || value === null) {
                continue;
            }
            sValueCount += 1;
            sTotalValue += value;
            sMinimumValue = Math.min(sMinimumValue, value);
            sMaximumValue = Math.max(sMaximumValue, value);
        }

        if (sValueCount === 0) return [];

        return [{
            series: sSeriesConfig,
            min: sMinimumValue.toFixed(5),
            max: sMaximumValue.toFixed(5),
            avg: (sTotalValue / sValueCount).toFixed(5),
        }];
    });
}
