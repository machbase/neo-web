import { useEffect } from 'react';
import {
    Button,
    QuickTimeRange,
    type QuickTimeRangeOption,
} from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type { PanelInfo } from '../../../domain/panel/PanelInfo';
import type {
    TimeRangeInput,
    TimeRangeMs,
} from '../../../domain/time/TimeTypes';
import {
    isEmptyPanelRangeInput,
    isPanelRangeExpressionValidForAxis,
} from '../../../domain/panelRange/PanelRangeInput';
import type { OpenEditorTimeRangeModal } from '../../modal/EditorTimeRangeModal';
import styles from '../PanelEditor.module.scss';

const NUMERIC_QUICK_RANGE: QuickTimeRangeOption[][] = [
    [
        { key: 'first-10', name: 'First 10', value: ['first', 'first-10'] },
        { key: 'first-100', name: 'First 100', value: ['first', 'first-100'] },
        { key: 'first-1000', name: 'First 1000', value: ['first', 'first-1000'] },
        { key: 'first-10000', name: 'First 10k', value: ['first', 'first-10000'] },
        { key: 'first-100000', name: 'First 100k', value: ['first', 'first-100000'] },
        { key: 'first-1000000', name: 'First 1m', value: ['first', 'first-1000000'] },
        { key: 'first-10000000', name: 'First 10m', value: ['first', 'first-10000000'] },
    ],
    [
        { key: 'last-10', name: 'Last 10', value: ['last-10', 'last'] },
        { key: 'last-100', name: 'Last 100', value: ['last-100', 'last'] },
        { key: 'last-1000', name: 'Last 1000', value: ['last-1000', 'last'] },
        { key: 'last-10000', name: 'Last 10k', value: ['last-10000', 'last'] },
        { key: 'last-100000', name: 'Last 100k', value: ['last-100000', 'last'] },
        { key: 'last-1000000', name: 'Last 1m', value: ['last-1000000', 'last'] },
        { key: 'last-10000000', name: 'Last 10m', value: ['last-10000000', 'last'] },
    ],
];

const EditorTimeTab = ({
    pChartTitle,
    pTimeConfig,
    pIsNumericXAxis,
    pPanelRange,
    pOnChangeTimeConfig,
    pOnInvalidTimeInputChange,
    pOpenTimeRangePanel,
}: {
    pChartTitle: PanelInfo['title'];
    pTimeConfig: PanelInfo['time'];
    pIsNumericXAxis: boolean;
    pPanelRange: TimeRangeMs;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pOnInvalidTimeInputChange: (hasInvalidTimeInput: boolean) => void;
    pOpenTimeRangePanel: OpenEditorTimeRangeModal;
}) => {
    const sRangeInput = pIsNumericXAxis
        ? getNumericRangeInput(pTimeConfig.rangeInput)
        : getTimestampRangeInput(pTimeConfig.rangeInput);
    const sHasConfiguredRange = !isEmptyPanelRangeInput(sRangeInput);
    const sRangeAxisLabel = pIsNumericXAxis ? 'Numeric' : 'Time';
    useEffect(() => {
        pOnInvalidTimeInputChange(false);
    }, [pOnInvalidTimeInputChange]);

    function applyRangeInput(start: string, end: string): void {
        pOnInvalidTimeInputChange(false);
        pOnChangeTimeConfig(
            createTimeConfig(pTimeConfig, {
                start,
                end,
            }),
        );
    }

    function openConfiguredRangePanel(): void {
        pOpenTimeRangePanel({
            chartTitle: pChartTitle,
            isNumericXAxis: pIsNumericXAxis,
            rangeInput: sRangeInput,
            panelRange: pPanelRange,
            onApplyRangeInput: applyRangeInput,
        });
    }

    function clearTimeRange(): void {
        applyRangeInput('', '');
    }

    function applyQuickRange(option: QuickTimeRangeOption): void {
        const [sStartValue = '', sEndValue = ''] = option.value;

        applyRangeInput(sStartValue, sEndValue);
    }

    return (
        <div className={styles.timeLayout}>
            <section
                className={[
                    styles.section,
                    styles.timeConfiguredSection,
                ].join(' ')}
            >
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Panel configured range
                    </span>
                    <span className={styles.sectionTag}>
                        {sRangeAxisLabel}
                    </span>
                </div>
                <div className={styles.timeSummaryGrid}>
                    <div className={styles.editorField}>
                        <span className={styles.editorFieldLabel}>From</span>
                        <span className={styles.editorFixedValue}>
                            {formatRangeDisplayValue(sRangeInput.start)}
                        </span>
                    </div>
                    <div className={styles.editorField}>
                        <span className={styles.editorFieldLabel}>To</span>
                        <span className={styles.editorFixedValue}>
                            {formatRangeDisplayValue(sRangeInput.end)}
                        </span>
                    </div>
                </div>
                <div className={styles.controlRow}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={openConfiguredRangePanel}
                    >
                        Configure
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<VscTrash size={16} />}
                        disabled={!sHasConfiguredRange}
                        onClick={clearTimeRange}
                    >
                        Clear
                    </Button>
                </div>
            </section>
            <section
                className={[
                    styles.section,
                    styles.timeQuickSection,
                ].join(' ')}
            >
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                        Quick panel configured range
                    </span>
                </div>
                <QuickTimeRange
                    className={styles.timeQuickRange}
                    options={pIsNumericXAxis ? NUMERIC_QUICK_RANGE : TIME_RANGE}
                    onSelect={applyQuickRange}
                    title=""
                />
            </section>
        </div>
    );
};

function createTimeConfig(
    currentTimeConfig: PanelInfo['time'],
    rangeInput: TimeRangeInput,
): PanelInfo['time'] {
    return {
        ...currentTimeConfig,
        rangeInput,
    };
}

function getTimestampRangeInput(
    rangeInput: TimeRangeInput,
): TimeRangeInput {
    return {
        start: sanitizeExpressionForAxis(rangeInput.start, false),
        end: sanitizeExpressionForAxis(rangeInput.end, false),
    };
}

function getNumericRangeInput(
    rangeInput: TimeRangeInput,
): TimeRangeInput {
    return {
        start: sanitizeExpressionForAxis(rangeInput.start, true),
        end: sanitizeExpressionForAxis(rangeInput.end, true),
    };
}

function sanitizeExpressionForAxis(
    value: string,
    isNumericAxis: boolean,
): string {
    return isPanelRangeExpressionValidForAxis(value, isNumericAxis) ? value : '';
}

function formatRangeDisplayValue(value: string): string {
    return value.trim() || 'Auto';
}

export default EditorTimeTab;
