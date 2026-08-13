import {
    Button,
    Input,
    QuickTimeRange,
} from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { useLayoutEffect } from 'react';
import type { PanelInfo } from '../../panelModel';
import { formatAbsoluteTime } from '../../../persistence/serializeRange';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from '../../../range/rangeModel';
import {
    NUMERIC_RANGE_PRESETS,
    TIME_RANGE_PRESETS,
} from '../../../range/rangePresets';
import { resolveRangeInput } from '../../../range/rangeInput';
import { Section } from './TabControls';

import styles from '../PanelEditor.module.scss';

const RANGE_ENDPOINTS = [
    ['start', 'From'],
    ['end', 'To'],
] as const;
const NUMERIC_RANGE_INPUT_PLACEHOLDER = '20, first, first-10, last-10';
const EditorTimeTab = ({
    pTimeConfig,
    pAxisKind,
    pDataRange,
    pMainRange,
    pDataValidationMessage,
    pOnChangeTimeConfig,
    pReportValidity,
    pIsActive,
}: {
    pTimeConfig: PanelInfo['time'];
    pAxisKind: AxisKind | undefined;
    pDataRange: AxisRange;
    pMainRange: AxisRange;
    pDataValidationMessage?: string;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pReportValidity: (
        tab: 'Main Range',
        isValid: boolean,
        message?: string,
    ) => void;
    pIsActive: boolean;
}) => {
    const sIsNumericXAxis = pAxisKind === 'numeric';
    const sRangeInput = pTimeConfig.rangeInput;
    const sIsValid =
        !pAxisKind ||
        isRangeExpressionEmpty(sRangeInput) ||
        resolveRangeInput(
            sRangeInput,
            pAxisKind,
            pDataRange,
            pMainRange,
        ) !== undefined;
    useLayoutEffect(() => {
        pReportValidity(
            'Main Range',
            sIsValid,
            sIsValid ? undefined : 'Enter a valid range.',
        );
    }, [pReportValidity, sIsValid]);
    if (!pIsActive) return null;
    if (!pAxisKind) {
        return <span className={styles.fieldError}>{pDataValidationMessage}</span>;
    }
    const sTimePlaceholders =
        isRangeExpressionEmpty(sRangeInput)
            ? {
                  start: formatAbsoluteTime(pMainRange.start),
                  end: formatAbsoluteTime(pMainRange.end),
              }
            : undefined;

    function applyRangeInput(rangeInput: RangeExpressionInput): void {
        pOnChangeTimeConfig({ ...pTimeConfig, rangeInput });
    }

    function setRangeValue(
        field: keyof RangeExpressionInput,
        value: string,
    ): void {
        applyRangeInput({ ...sRangeInput, [field]: value });
    }

    return (
        <div className={styles.timeLayout}>
            <Section
                title="Range"
                className={styles.timeConfiguredSection}
                headerAddon={
                    <span className={styles.sectionTag}>
                        {sIsNumericXAxis ? 'Numeric' : 'Time'}
                    </span>
                }
            >
                <div className={styles.timeRangeInputs}>
                    {RANGE_ENDPOINTS.map(([field, label]) => (
                        <Input
                            key={field}
                            fullWidth
                            label={label}
                            labelPosition="left"
                            value={sRangeInput[field]}
                            placeholder={sIsNumericXAxis
                                ? NUMERIC_RANGE_INPUT_PLACEHOLDER
                                : sTimePlaceholders?.[field]}
                            onChange={(event) =>
                                setRangeValue(field, event.target.value)
                            }
                        />
                    ))}
                </div>
                {!sIsValid && (
                    <span className={styles.fieldError}>
                        {sIsNumericXAxis
                            ? 'Enter both value boundaries in a valid order.'
                            : 'Enter both range boundaries in a valid order.'}
                    </span>
                )}
                <div className={styles.controlRow}>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<VscTrash size={16} />}
                        disabled={
                            sRangeInput.start === '' &&
                            sRangeInput.end === ''
                        }
                        onClick={() => applyRangeInput({ start: '', end: '' })}
                    >
                        Clear
                    </Button>
                </div>
            </Section>
            <Section
                title="Quick ranges"
                className={styles.timeQuickSection}
            >
                <QuickTimeRange
                    className={styles.timeQuickRange}
                    options={sIsNumericXAxis
                        ? NUMERIC_RANGE_PRESETS
                        : TIME_RANGE_PRESETS}
                    onSelect={(option) => {
                        const [start = '', end = ''] = option.value;
                        applyRangeInput({ start, end });
                    }}
                    title=""
                />
            </Section>
        </div>
    );
};

export default EditorTimeTab;
