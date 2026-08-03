import { Button, Input, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import type { PanelInfo } from '../../../model';
import {
    NUMERIC_QUICK_RANGE_OPTIONS,
    NUMERIC_RANGE_EXPRESSION_PLACEHOLDER,
} from '../../../range/format/numericRangeFormat';
import { formatAbsoluteTimeExpression } from '../../../range/format/timeRangeFormat';
import { isValidRange } from '../../../range/rangeArithmetic';
import {
    isRangeExpressionEmpty,
    type AxisRange,
    type RangeExpressionInput,
} from '../../../range/rangeModel';
import { TimeExpressionInput } from '../../../range/RangeModal';
import { TAG_ANALYZER_TIME_RANGE_OPTIONS } from '../../../range/timeQuickRangeOptions';
import { Section } from './EditorControls';

import styles from '../PanelEditor.module.scss';

const RANGE_ENDPOINTS = [
    ['start', 'From'],
    ['end', 'To'],
] as const;

const EditorTimeTab = ({
    pTimeConfig,
    pIsNumericXAxis,
    pIsRangeInputValid,
    pPanelRange,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: PanelInfo['time'];
    pIsNumericXAxis: boolean;
    pIsRangeInputValid: boolean;
    pPanelRange: AxisRange;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
}) => {
    const sRangeInput = pTimeConfig.rangeInput;
    const sTimePlaceholders =
        isRangeExpressionEmpty(sRangeInput) && isValidRange(pPanelRange)
            ? {
                  start: formatAbsoluteTimeExpression(pPanelRange.startTime),
                  end: formatAbsoluteTimeExpression(pPanelRange.endTime),
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
                        {pIsNumericXAxis ? 'Numeric' : 'Time'}
                    </span>
                }
            >
                <div className={styles.timeRangeInputs}>
                    {RANGE_ENDPOINTS.map(([field, label]) =>
                        pIsNumericXAxis ? (
                            <Input
                                key={field}
                                fullWidth
                                label={label}
                                labelPosition="left"
                                value={sRangeInput[field]}
                                placeholder={NUMERIC_RANGE_EXPRESSION_PLACEHOLDER}
                                onChange={(event) =>
                                    setRangeValue(field, event.target.value)
                                }
                            />
                        ) : (
                            <TimeExpressionInput
                                key={field}
                                label={label}
                                value={sRangeInput[field]}
                                placeholder={sTimePlaceholders?.[field]}
                                onChange={(value) =>
                                    setRangeValue(field, value)
                                }
                            />
                        ),
                    )}
                </div>
                {!pIsRangeInputValid && (
                    <span className={styles.fieldError}>
                        {pIsNumericXAxis
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
                    options={pIsNumericXAxis
                        ? NUMERIC_QUICK_RANGE_OPTIONS
                        : TAG_ANALYZER_TIME_RANGE_OPTIONS}
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
