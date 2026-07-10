import { useCallback, useEffect, useState } from 'react';
import { LineChart, Play } from '@/assets/icons/Icon';
import { Spinner } from '@/components/spinner/Spinner';
import { Button, Dropdown, Input, Modal, Page, Toast } from '@/design-system/components';
import { ShowVisualization } from '../../../tql/ShowVisualization';
import type { SelectedRangeSeriesSummary } from '../../domain/ChartDomain';
import { TimeUnit } from '../../domain/time/TimeTypes';
import {
    formatTimeUnitShortCode,
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
} from '../../domain/time/TimeIntervalUtils';
import { formatRangeEndpointLabel } from '../../domain/time/TimeFormatters';
import {
    fetchFftChartData,
    type FetchFftChartDataParams,
    type FftChartData,
} from '../../fetch/fft/FftChartFetch';

const FFT_INTERVAL_OPTIONS = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
].map((unit) => ({
    value: unit,
    label: formatTimeUnitShortCode(unit),
}));
const FFT_FORM_ROW_STYLE = { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px' } as const;
const FFT_SUMMARY_ROW_STYLE = { display: 'flex', flexDirection: 'row', gap: '8px' } as const;
const FFT_MODAL_STYLE = { minHeight: '200px', height: 'auto', maxHeight: '80vh' } as const;

type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

function createFFTModalOptions(seriesSummaries: SelectedRangeSeriesSummary[]): FFTModalOption[] {
    return seriesSummaries.map((summary) => ({
        value: `${summary.table}_${summary.name}_${summary.seriesIndex}`,
        label: summary.alias || summary.name,
        data: summary,
    }));
}

type FFTModalProps = {
    seriesSummaries: SelectedRangeSeriesSummary[];
    startTime: number;
    endTime: number;
    isNumericXAxis: boolean;
    onClose: () => void;
};

export const FFTModal = ({
    seriesSummaries,
    startTime,
    endTime,
    isNumericXAxis,
    onClose,
}: FFTModalProps) => {
    const [sSelectedInfo, setSelectedInfo] = useState<SelectedRangeSeriesSummary | null>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sInterval, setInterval] = useState<string>('100');
    const [sIntervalUnit, setIntervalUnit] = useState<TimeUnit>(TimeUnit.Millisecond);
    const [sMinHz, setMinHz] = useState<string>('0');
    const [sMaxHz, setMaxHz] = useState<string>('0');
    const {
        chartData: sChartData,
        isLoading: sIsLoading,
        loadChartData,
    } = useFftChartData();
    const sRangeLabel = `${formatRangeEndpointLabel(
        startTime,
        isNumericXAxis,
    )} ~ ${formatRangeEndpointLabel(endTime, isNumericXAxis)}`;
    const sDropdownOptions = createFFTModalOptions(seriesSummaries);

    useEffect(() => {
        const sInitialSummary = seriesSummaries[0];
        if (sInitialSummary === undefined) {
            return;
        }

        setSelectedInfo(sInitialSummary);
        void loadChartData({
            isChart2D: true,
            selectedInfo: sInitialSummary,
            minHz: '0',
            maxHz: '0',
            isNumericXAxis,
            startTime,
            endTime,
        });
    }, [endTime, isNumericXAxis, loadChartData, seriesSummaries, startTime]);

    const handleSelectedTag = (value: string) => {
        const sSelectedOption = sDropdownOptions.find(
            (option) => option.value === value,
        );
        if (!sSelectedOption) {
            return;
        }

        setSelectedInfo(sSelectedOption.data);
    };

    function handle2DChart(): void {
        const sNextIsChart2D = !sIsChart2D;

        if (!sNextIsChart2D && isNumericXAxis) {
            Toast.warning(
                '3D FFT is only available for datetime x-axis panels.',
                undefined,
            );
            return;
        }

        setIsChart2D(sNextIsChart2D);
        if (!sNextIsChart2D) {
            setInterval('100');
        }
    }

    const handleRunCode = () => {
        if (!sSelectedInfo) {
            Toast.error('Please select a tag.');
            return;
        }

        const sMinHzValue = sMinHz === '' ? '0' : sMinHz;
        const sMaxHzValue = sMaxHz === '' ? '0' : sMaxHz;

        if (sMinHzValue !== sMinHz) {
            setMinHz(sMinHzValue);
        }

        if (sMaxHzValue !== sMaxHz) {
            setMaxHz(sMaxHzValue);
        }

        let sIntervalMs: string | undefined;
        if (!sIsChart2D) {
            if (isNumericXAxis) {
                Toast.warning(
                    '3D FFT is only available for datetime x-axis panels.',
                    undefined,
                );
                return;
            }

            if (sInterval === '' || sInterval === '0') {
                Toast.error('Please put an interval value');
                return;
            }

            sIntervalMs = getTimeUnitMilliseconds(
                sIntervalUnit,
                Number(sInterval),
            ).toString();
        }

        void loadChartData({
            isChart2D: sIsChart2D,
            selectedInfo: sSelectedInfo,
            minHz: sMinHzValue,
            maxHz: sMaxHzValue,
            isNumericXAxis,
            startTime,
            endTime,
            intervalMs: sIntervalMs,
        });
    };

    const handleSelectInterval = (value: string) => {
        const sNormalizedUnit = normalizeTimeUnit(value);
        if (sNormalizedUnit) {
            setIntervalUnit(sNormalizedUnit);
        }
    };

    return (
        <div className="fft-modal-wrapper">
            <Modal.Root
                isOpen
                onClose={onClose}
                size="lg"
                style={FFT_MODAL_STYLE}
            >
                <Modal.Header>
                    <Modal.Title>
                        <LineChart size={16} /> FFT
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Page.DpRowBetween
                        style={FFT_FORM_ROW_STYLE}
                    >
                        <Dropdown.Root
                            options={sDropdownOptions}
                            value={
                                sDropdownOptions.find(
                                    (option) => option.data === sSelectedInfo,
                                )?.value
                            }
                            onChange={handleSelectedTag}
                            placeholder="Select tag"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <Button.Group>
                            <Button
                                size="sm"
                                variant="ghost"
                                icon={<div>{sIsChart2D ? '2D' : '3D'}</div>}
                                onClick={handle2DChart}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                icon={<Play size={16} />}
                                onClick={handleRunCode}
                            />
                        </Button.Group>
                    </Page.DpRowBetween>

                    <Page.DpRow
                        style={FFT_FORM_ROW_STYLE}
                    >
                        <Input
                            label="Min Hz"
                            labelPosition="left"
                            type="number"
                            size="md"
                            width={100}
                            height={32}
                            value={sMinHz}
                            onChange={(event) => setMinHz(event.target.value)}
                        />
                        <Input
                            label="Max Hz"
                            labelPosition="left"
                            type="number"
                            width={100}
                            height={32}
                            value={sMaxHz}
                            onChange={(event) => setMaxHz(event.target.value)}
                        />
                        {!sIsChart2D ? (
                            <Page.DpRow
                                style={FFT_FORM_ROW_STYLE}
                            >
                                <Input
                                    label="Interval"
                                    labelPosition="left"
                                    type="number"
                                    value={sInterval}
                                    onChange={(event) => setInterval(event.target.value)}
                                />
                                <Dropdown.Root
                                    options={FFT_INTERVAL_OPTIONS}
                                    value={sIntervalUnit}
                                    onChange={handleSelectInterval}
                                    placeholder="Unit"
                                >
                                    <Dropdown.Trigger />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </Page.DpRow>
                        ) : null}
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow style={FFT_SUMMARY_ROW_STYLE}>
                        <Page.ContentText pContent={`Min: ${sSelectedInfo?.min}`} />
                        <Page.ContentText pContent={`Max: ${sSelectedInfo?.max}`} />
                        <Page.ContentText pContent={`Avg: ${sSelectedInfo?.avg}`} />
                        <Page.ContentText pContent={sRangeLabel} />
                    </Page.DpRow>
                    {sIsLoading && (
                        <div className="loading-center">
                            <Spinner />
                        </div>
                    )}
                    {!sIsLoading && sChartData && (
                        <ShowVisualization pData={sChartData} pLoopMode={false} />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

function useFftChartData(): {
    chartData: FftChartData | null;
    isLoading: boolean;
    loadChartData: (params: FetchFftChartDataParams) => Promise<void>;
} {
    const [sChartData, setChartData] = useState<FftChartData | null>(null);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);

    const loadChartData = useCallback(async (
        params: FetchFftChartDataParams,
    ): Promise<void> => {
        setIsLoading(true);

        try {
            const sNextChartData = await fetchFftChartData(params);

            if (sNextChartData) {
                setChartData(sNextChartData);
            }
        } catch {
            Toast.error('Failed to load FFT chart.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        chartData: sChartData,
        isLoading: sIsLoading,
        loadChartData,
    };
}
