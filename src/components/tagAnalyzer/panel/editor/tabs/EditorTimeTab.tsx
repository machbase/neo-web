import {
    Button,
    DatePicker,
} from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import DistanceRangeTab, {
    DistanceQuickWindows,
} from '@/components/modal/DistanceRangeTab';
import type { PanelInfo } from '../../panelModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from '../../../range/rangeModel';
import { TIME_RANGE_PRESETS } from '../../../range/rangePresets';
import { Inline, Section, Stack, Text } from '../../../ui/Presentation';
import { QuickTimeRange } from '../../../ui/QuickTimeRange';

import styles from '../PanelEditorTab.module.scss';

export default function EditorTimeTab({
    pTimeConfig,
    pAxisKind,
    pDataRange,
    pIsValid,
    pDataValidationMessage,
    pOnChangeTimeConfig,
    pIsActive,
}: {
    pTimeConfig: PanelInfo['time'];
    pAxisKind: AxisKind | undefined;
    pDataRange: AxisRange;
    pIsValid: boolean;
    pDataValidationMessage?: string;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pIsActive: boolean;
}) {
    const sIsNumericXAxis = pAxisKind === 'numeric';
    const sRangeInput = pTimeConfig.rangeInput;
    if (!pIsActive) return null;
    if (!pAxisKind) {
        return <Text variant="caption" tone="danger">{pDataValidationMessage}</Text>;
    }
    function applyRangeInput(rangeInput: RangeExpressionInput): void {
        pOnChangeTimeConfig({ ...pTimeConfig, rangeInput });
    }

    function setRangeValue(
        field: keyof RangeExpressionInput,
        value: string,
    ): void {
        applyRangeInput({ ...sRangeInput, [field]: value });
    }

    function setDistanceRangeValue(
        start: number | string,
        end: number | string,
    ): void {
        applyRangeInput({ start: String(start), end: String(end) });
    }

    const sRangeIsEmpty = isRangeExpressionEmpty(sRangeInput);
    // An empty custom range means the whole data extent. The highlighted main-chart window is only
    // the current viewport and must not become the editor's apparent default range.

    return (
        <Section title={sIsNumericXAxis ? 'Custom distance range' : 'Custom time range'}>
            <Inline gap={12} align="start" wrap>
                <Stack gap={8} className={styles.timeConfiguredSection}>
                    {sIsNumericXAxis ? (
                        <DistanceRangeTab
                            pBounds={{
                                min: pDataRange.start,
                                max: pDataRange.end,
                            }}
                            pFrom={sRangeInput.start.trim() || pDataRange.start}
                            pTo={sRangeInput.end.trim() || pDataRange.end}
                            pOnChange={setDistanceRangeValue}
                            pOnResetToFull={() =>
                                applyRangeInput({ start: '', end: '' })
                            }
                            pResetLabel="Clear"
                            pResetDisabled={sRangeIsEmpty}
                            pBadge={sRangeIsEmpty ? 'Data' : 'Panel'}
                            pMuted={sRangeIsEmpty}
                            pHideQuickWindows
                        />
                    ) : (
                        <>
                            {(['start', 'end'] as const).map((field) => (
                                <DatePicker
                                    key={field}
                                    pTestId={`range-${field}`}
                                    pLabel={field === 'start' ? 'From' : 'To'}
                                    pTopPixel={32}
                                    pTimeValue={sRangeInput[field]}
                                    onChange={(event: any) =>
                                        setRangeValue(field, event.target.value)
                                    }
                                    pSetApply={(value: string) =>
                                        setRangeValue(field, value)
                                    }
                                />
                            ))}
                            <Inline justify="end">
                                <Button
                                    data-testid="range-clear"
                                    variant="ghost"
                                    disabled={sRangeIsEmpty}
                                    onClick={() =>
                                        applyRangeInput({ start: '', end: '' })
                                    }
                                >
                                    <VscTrash size={16} />
                                    <span>Clear</span>
                                </Button>
                            </Inline>
                        </>
                    )}
                    {!pIsValid && (
                        <Text variant="caption" tone="danger">
                            {sIsNumericXAxis
                                ? 'Enter both value boundaries in a valid order.'
                                : 'Enter both range boundaries in a valid order.'}
                        </Text>
                    )}
                </Stack>
                <div className={styles.timeQuickSection}>
                    {sIsNumericXAxis ? (
                        <DistanceQuickWindows
                            pBounds={{
                                min: pDataRange.start,
                                max: pDataRange.end,
                            }}
                            pOnSelect={setDistanceRangeValue}
                        />
                    ) : (
                        <QuickTimeRange
                            layout="responsive"
                            options={TIME_RANGE_PRESETS}
                            onSelect={(option) => {
                                const [start = '', end = ''] = option.value;
                                applyRangeInput({ start, end });
                            }}
                            title=""
                        />
                    )}
                </div>
            </Inline>
        </Section>
    );
}
