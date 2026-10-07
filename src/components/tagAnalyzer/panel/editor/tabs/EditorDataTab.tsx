import { useEffect, useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, ColorPicker, Button } from '@/design-system/components';
import { PanelSeriesEditor } from '../../series/PanelSeriesEditor';
import { SeriesCalculationModeField } from '../../series/SeriesCalculationModeField';
import { Field, Inline, Stack, Surface, Text } from '../../../ui/Presentation';
import { SeriesDialog } from '../../../ui/SeriesDialog';
import type { PanelInfo } from '../../panelModel';
import type { AxisKind } from '../../../rangeExpression/rangeModel';
import {
    getPanelSeriesDisplayColor,
    getSeriesListAxisKind,
    X_AXIS_KIND_CHANGE_WARNING,
    type PanelSeriesDefinition,
    updatePanelSeriesCalculationMode,
} from '../../../seriesModel';
import type { RollupTableMap } from '../../../api/rollupMetadata';
import styles from '../PanelEditorTab.module.scss';
import controls from '../../../ui/Controls.module.scss';

export default function EditorDataTab({
    pQueryDraft,
    pRollupTableList,
    pLockedAxisKind,
    pOnChangeQueryDraft,
    pIsActive,
}: {
    pQueryDraft: PanelInfo['query'];
    pRollupTableList: RollupTableMap;
    pLockedAxisKind: AxisKind | undefined;
    pOnChangeQueryDraft: (
        update: (previous: PanelInfo['query']) => PanelInfo['query'],
    ) => void;
    pIsActive: boolean;
}) {
    const [sSeriesDraft, setSeriesDraft] = useState<
        PanelSeriesDefinition[] | undefined
    >();
    const [sSeriesFooterMessage, setSeriesFooterMessage] =
        useState<string | undefined>();
    useEffect(() => {
        if (!pIsActive) {
            setSeriesDraft(undefined);
            setSeriesFooterMessage(undefined);
        }
    }, [pIsActive]);
    if (!pIsActive) return null;

    // Every change goes through an updater on the latest draft. The color picker reports its
    // change 100ms late, so a change built from this render's pQueryDraft could overwrite an
    // edit made in the meantime.
    const updateTagSet = (
        update: (tagSet: PanelSeriesDefinition[]) => PanelSeriesDefinition[],
    ) => {
        pOnChangeQueryDraft((query) => ({ ...query, tagSet: update(query.tagSet) }));
    };

    function closeSeriesModal(): void {
        setSeriesDraft(undefined);
        setSeriesFooterMessage(undefined);
    }

    function applySeriesSelection(): void {
        if (!sSeriesDraft) return;
        const sNextAxisKind = getSeriesListAxisKind(sSeriesDraft);
        if (
            pLockedAxisKind &&
            sNextAxisKind &&
            sNextAxisKind !== pLockedAxisKind
        ) {
            setSeriesFooterMessage(X_AXIS_KIND_CHANGE_WARNING);
            return;
        }
        updateTagSet(() => sSeriesDraft);
        closeSeriesModal();
    }

    return (
        <>
            {pQueryDraft.tagSet.map((item, seriesIndex) => {
                const updateItem = (
                    update: (series: PanelSeriesDefinition) => PanelSeriesDefinition,
                ) =>
                    updateTagSet((tagSet) =>
                        tagSet.map((series) =>
                            series.key === item.key ? update(series) : series,
                        ),
                    );
                const patchItem = (patch: Partial<PanelSeriesDefinition>) =>
                    updateItem((series) => ({ ...series, ...patch }));

                return (
                    <Surface
                        variant="inset"
                        key={item.key}
                        data-testid={`series-${encodeURIComponent(item.key)}`}
                        role="group"
                        aria-label={`${item.sourceTagName} (${item.table}) series`}
                    >
                        <Inline gap={16} align="end" wrap>
                            <Stack gap={8}
                                className={styles.editorSeriesIdentity}
                            >
                                <Text
                                    data-testid={`source-tag-${encodeURIComponent(JSON.stringify([item.table, item.sourceTagName]))}`}
                                    variant="label"
                                    weight="semibold"
                                    tone="default"
                                    truncate
                                    title={`${item.sourceTagName} (${item.table})`}
                                >
                                    {item.sourceTagName}
                                </Text>
                                <Field label="Alias">
                                    <Input
                                        data-testid="alias"
                                        aria-label="Alias"
                                        title={item.alias}
                                        value={item.alias}
                                        onChange={(event) =>
                                            patchItem({ alias: event.target.value })
                                        }
                                        size="md"
                                        fullWidth
                                    />
                                </Field>
                            </Stack>
                            <Field label="Calculation mode" className={styles.editorNarrowControl}>
                                <SeriesCalculationModeField
                                    value={item.calculationMode}
                                    onChange={(mode) => updateItem((series) => updatePanelSeriesCalculationMode(series, mode))}
                                    className={controls.control}
                                />
                            </Field>
                            <Field label="Color">
                                <Inline className={controls.control}>
                                    <ColorPicker
                                        data-testid="series-color"
                                        color={getPanelSeriesDisplayColor(item, seriesIndex)}
                                        onChange={(color) => patchItem({ color })}
                                        tooltipContent="Color"
                                    />
                                </Inline>
                            </Field>
                            {pQueryDraft.tagSet.length !== 1 && (
                                <Button
                                    data-testid="remove"
                                    className={styles.editorSeriesRemoveButton}
                                    size="xsm"
                                    variant="ghost"
                                    icon={
                                        <Close size={16} color="#f8f8f8" />
                                    }
                                    onClick={() =>
                                        updateTagSet((tagSet) =>
                                            tagSet.filter((tag) => tag.key !== item.key),
                                        )
                                    }
                                />
                            )}
                        </Inline>
                    </Surface>
                );
            })}
            {sSeriesDraft && (
                <SeriesDialog
                    title="Edit Series"
                    onClose={closeSeriesModal}
                    onApply={applySeriesSelection}
                    message={sSeriesFooterMessage}
                    data-testid="editor-series-dialog"
                >
                    <PanelSeriesEditor
                        seriesList={sSeriesDraft}
                        rollupTableList={pRollupTableList}
                        lockedAxisKind={pLockedAxisKind}
                        onFooterMessageChange={setSeriesFooterMessage}
                        onSeriesListChange={setSeriesDraft}
                    />
                </SeriesDialog>
            )}
            <Button
                data-testid="add-series"
                className={styles.editorAddSeriesButton}
                variant="secondary"
                size="sm"
                shadow
                icon={<PlusCircle size={16} />}
                title="Click to add a new series"
                aria-label="Click to add a new series"
                onClick={() => setSeriesDraft([...pQueryDraft.tagSet])}
            >
                Add new series
            </Button>
        </>
    );
}
