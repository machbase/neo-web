import type { RangeState } from '../../rangeControl/rangeControlModel';
import { VscTrash } from '@/assets/icons/Icon';
import DistanceRangeTab from '@/components/modal/DistanceRangeTab';
import { Button, DatePicker } from '@/design-system/components';
import type { PanelInfo } from '../../panelModel';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
} from '../../../rangeExpression/rangeModel';
import { TIME_RANGE_PRESETS } from '../../rangeControl/rangePresets';
import { resolveRangeInput } from '../../../rangeExpression/rangeInput';
import { Section, Stack, Text } from '../../../ui/Presentation';
import { QuickTimeRange } from '../../../ui/QuickTimeRange';
import { isEditorRangeValid } from '../editorValidation';
import { updateEditorRangeDraft } from '../editorRangeDraft';
import styles from '../PanelEditorTab.module.scss';

export default function EditorRangeTab({
    pTimeConfig,
    pAxisKind,
    pDataRange,
    pMainRange,
    pNavigatorRange,
    pPreviewRange,
    pDataValidationMessage,
    pOnChangeTimeConfig,
    pIsActive,
}: {
    pTimeConfig: PanelInfo['time'];
    pAxisKind: AxisKind | undefined;
    pDataRange: AxisRange;
    pMainRange: AxisRange;
    pNavigatorRange: AxisRange;
    pPreviewRange?: RangeState;
    pDataValidationMessage?: string;
    pOnChangeTimeConfig: (config: PanelInfo['time']) => void;
    pIsActive: boolean;
}) {
    if (!pIsActive) return null;
    if (!pAxisKind) {
        return <Text variant="caption" tone="danger">{pDataValidationMessage}</Text>;
    }
    const sections = [
        { key: 'rangeInput', title: 'Main Range', testId: 'editor-main-range', current: pMainRange },
        { key: 'navigatorRangeInput', title: 'Nav Range', testId: 'editor-nav-range', current: pNavigatorRange },
    ] as const;
    const distanceBounds = pDataRange.end === Number.MAX_SAFE_INTEGER
        ? { min: 0, max: 0 }
        : { min: pDataRange.start, max: pDataRange.end };
    const hasDistanceBounds = distanceBounds.max > distanceBounds.min;
    const navigatorInput = pTimeConfig.navigatorRangeInput;
    const navigatorRange = pPreviewRange?.navigatorRange ?? (
        navigatorInput?.start.trim() && navigatorInput.end.trim()
            ? resolveRangeInput(navigatorInput, pAxisKind, pDataRange, pNavigatorRange)
            : undefined
    ) ?? pNavigatorRange;

    return (
        <div className={styles.rangeGrid}>
            {sections.map(({ key, title, testId, current }) => {
                const input = pTimeConfig[key] ?? { start: '', end: '' };
                const isEmpty = isRangeExpressionEmpty(input);
                const automaticRange = key === 'rangeInput'
                    ? pPreviewRange?.mainRange ?? pMainRange
                    : pPreviewRange?.navigatorRange ?? pDataRange;
                const setRange = (start: number | string, end: number | string) => {
                    const next = updateEditorRangeDraft(pTimeConfig, key, { start: String(start), end: String(end) }, {
                        axisKind: pAxisKind,
                        dataRange: pDataRange,
                        currentRange: { mainRange: pMainRange, navigatorRange: pNavigatorRange },
                        referenceTimeMs: Date.now(),
                    });
                    pOnChangeTimeConfig(next);
                };
                return (
                    <Section key={key} title={title} testId={testId} headerAddon={pAxisKind === 'time' && (
                        <Button
                            data-testid="reset-button"
                            variant="ghost"
                            size="sm"
                            className={styles.rangeReset}
                            icon={<VscTrash size={12} />}
                            disabled={isEmpty}
                            onClick={() => setRange('', '')}
                        >
                            Reset
                        </Button>
                    )}>
                        {pAxisKind === 'numeric' ? (
                            <DistanceRangeTab
                                pBounds={distanceBounds}
                                pSelectionBounds={key === 'rangeInput' ? { min: navigatorRange.start, max: navigatorRange.end } : undefined}
                                pAllowOutsideBounds
                                pFrom={isEmpty && hasDistanceBounds ? automaticRange.start : input.start}
                                pTo={isEmpty && hasDistanceBounds ? automaticRange.end : input.end}
                                pOnChange={setRange}
                                pOnTextChange={setRange}
                                pOnResetToFull={() => setRange('', '')}
                                pResetLabel="Reset"
                                pResetTitle={key === 'rangeInput' ? 'Clear the custom Main range and use the automatic range' : undefined}
                                pResetDisabled={isEmpty}
                                pBadge={isEmpty ? 'Auto' : 'Custom'}
                                pMuted={isEmpty}
                            />
                        ) : (
                            <Stack gap={16}>
                                {(['start', 'end'] as const).map((field) => (
                                    <DatePicker
                                        key={field}
                                        pTestId={`tag-analyzer-range-${field === 'start' ? 'from' : 'to'}-input`}
                                        pLabel={field === 'start' ? 'From' : 'To'}
                                        pTimeValue={input[field]}
                                        placeholder="now-1h, last-1d, or date/time"
                                        onChange={(event) => setRange(
                                            field === 'start' ? event.target.value : input.start,
                                            field === 'end' ? event.target.value : input.end,
                                        )}
                                        pSetApply={(value) => setRange(
                                            field === 'start' ? value : input.start,
                                            field === 'end' ? value : input.end,
                                        )}
                                    />
                                ))}
                                <QuickTimeRange
                                    layout="responsive"
                                    options={TIME_RANGE_PRESETS}
                                    onSelect={({ value: [start = '', end = ''] }) => setRange(start, end)}
                                />
                            </Stack>
                        )}
                        {!isEditorRangeValid(input, pAxisKind, pDataRange, current) && (
                            <Text variant="caption" tone="danger" role="alert">Enter both range boundaries in a valid order.</Text>
                        )}
                    </Section>
                );
            })}
        </div>
    );
}
