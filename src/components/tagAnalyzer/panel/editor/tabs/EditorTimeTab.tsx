import {
    Button,
    DatePicker,
    Page,
    QuickTimeRange,
} from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import DistanceRangeTab, {
    DistanceQuickWindows,
} from '@/components/modal/DistanceRangeTab';
import { useLayoutEffect } from 'react';
import type { PanelInfo } from '../../panelModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from '../../../range/rangeModel';
import { TIME_RANGE_PRESETS } from '../../../range/rangePresets';
import { resolveRangeInput } from '../../../range/rangeInput';

import styles from '../PanelEditorTab.module.scss';

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
    const sDistanceFrom = sRangeInput.start.trim() || pDataRange.start;
    const sDistanceTo = sRangeInput.end.trim() || pDataRange.end;

    return (
        <>
            <Page.ContentBlock pHoverNone style={{ padding: 0, margin: 0 }}>
                <Page.ContentTitle>
                    {sIsNumericXAxis
                        ? 'Custom distance range'
                        : 'Custom time range'}
                </Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }}>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    {sIsNumericXAxis ? (
                        <DistanceRangeTab
                            pBounds={{
                                min: pDataRange.start,
                                max: pDataRange.end,
                            }}
                            pFrom={sDistanceFrom}
                            pTo={sDistanceTo}
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
                            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                <DatePicker
                                    pLabel="From"
                                    pTopPixel={32}
                                    pTimeValue={sRangeInput.start}
                                    onChange={(event: any) =>
                                        setRangeValue(
                                            'start',
                                            event.target.value,
                                        )
                                    }
                                    pSetApply={(value: string) =>
                                        setRangeValue('start', value)
                                    }
                                />
                            </Page.ContentBlock>
                            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                <DatePicker
                                    pLabel="To"
                                    pTopPixel={32}
                                    pTimeValue={sRangeInput.end}
                                    onChange={(event: any) =>
                                        setRangeValue('end', event.target.value)
                                    }
                                    pSetApply={(value: string) =>
                                        setRangeValue('end', value)
                                    }
                                />
                            </Page.ContentBlock>
                            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                <Page.DpRow style={{ justifyContent: 'end' }}>
                                    <Button
                                        variant="ghost"
                                        disabled={sRangeIsEmpty}
                                        onClick={() =>
                                            applyRangeInput({ start: '', end: '' })
                                        }
                                    >
                                        <VscTrash size={16} />
                                        <span>Clear</span>
                                    </Button>
                                </Page.DpRow>
                            </Page.ContentBlock>
                        </>
                    )}
                    {!sIsValid && (
                        <span className={styles.fieldError}>
                            {sIsNumericXAxis
                                ? 'Enter both value boundaries in a valid order.'
                                : 'Enter both range boundaries in a valid order.'}
                        </span>
                    )}
                </Page.ContentBlock>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
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
                            options={TIME_RANGE_PRESETS}
                            onSelect={(option) => {
                                const [start = '', end = ''] = option.value;
                                applyRangeInput({ start, end });
                            }}
                            title=""
                        />
                    )}
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default EditorTimeTab;
