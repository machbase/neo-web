import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTagsModal from '../../../modal/selectionPanel/AddTagsModal';
import { Tooltip } from 'react-tooltip';
import {
    getPanelSeriesDisplayColor,
    TAG_ANALYZER_AGGREGATION_MODE_OPTIONS,
    type PanelSeriesDefinition,
} from '../../../domain/SeriesDomain';
import type { EditorDataDraft } from '../EditorTypes';

type EditableSeriesField = 'sourceTagName' | 'calculationMode' | 'alias' | 'color';

const EditorDataTab = ({
    pDataDraft,
    pIsRawMode,
    pOnChangeDataDraft,
    pAvailableSourceTableNames,
}: {
    pDataDraft: EditorDataDraft;
    pIsRawMode: boolean;
    pOnChangeDataDraft: (dataDraft: EditorDataDraft) => void;
    pAvailableSourceTableNames: string[];
}) => {
    const [isModal, setIsModal] = useState(false);

    const setTagSet = (tag_set: PanelSeriesDefinition[]) => {
        pOnChangeDataDraft({ ...pDataDraft, tag_set });
    };

    const updateSeriesField = (key: string, field: EditableSeriesField, value: string) => {
        setTagSet(
            pDataDraft.tag_set.map((item: PanelSeriesDefinition) => {
                return item.key === key ? { ...item, [field]: value } : item;
            }),
        );
    };

    return (
        <>
            {pDataDraft.index_key &&
                pDataDraft.tag_set.map((item: PanelSeriesDefinition, seriesIndex: number) => {
                    const sSeriesColor = getPanelSeriesDisplayColor(item, seriesIndex);

                    return (
                        <Page
                            key={item.key}
                            style={{
                                borderRadius: '4px',
                                border: '1px solid #b8c8da41',
                                gap: '6px',
                                height: 'auto',
                                display: 'table',
                            }}
                        >
                            <Page.ContentBlock
                                style={{ padding: '4px', flexWrap: 'wrap' }}
                                pHoverNone
                            >
                                <Page.DpRow
                                    style={{
                                        width: '100%',
                                        paddingBottom: '8px',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <div style={{ opacity: pIsRawMode ? 0.45 : 1 }}>
                                        <Dropdown.Root
                                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                                            value={item.calculationMode ?? 'avg'}
                                            onChange={(value: string) =>
                                                updateSeriesField(
                                                    item.key,
                                                    'calculationMode',
                                                    value,
                                                )
                                            }
                                            label="Calc Mode"
                                            labelPosition="left"
                                            disabled={pIsRawMode}
                                        >
                                            <Dropdown.Trigger
                                                style={{ width: '120px' }}
                                            />
                                            <Dropdown.Menu>
                                                <Dropdown.List />
                                            </Dropdown.Menu>
                                        </Dropdown.Root>
                                    </div>
                                    <Input
                                        label={
                                            <span
                                                className={`taz-table-name-tooltip-${item.table}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                Source Tag Name
                                                <span style={{ fontSize: '10px' }}>
                                                    ({item.table})
                                                </span>
                                                <Tooltip
                                                    anchorSelect={`.taz-table-name-tooltip-${item.table}`}
                                                    content={item.table}
                                                />
                                            </span>
                                        }
                                        labelPosition="left"
                                        value={item.sourceTagName}
                                        onChange={(event) =>
                                            updateSeriesField(
                                                item.key,
                                                'sourceTagName',
                                                event.target.value,
                                            )
                                        }
                                        size="md"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <Input
                                        label="Alias"
                                        labelPosition="left"
                                        value={item.alias}
                                        onChange={(event) =>
                                            updateSeriesField(
                                                item.key,
                                                'alias',
                                                event.target.value,
                                            )
                                        }
                                        size="sm"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <ColorPicker
                                        color={sSeriesColor}
                                        onChange={(color: string) =>
                                            updateSeriesField(item.key, 'color', color)
                                        }
                                        tooltipContent="Color"
                                    />
                                    {pDataDraft.tag_set.length !== 1 && (
                                        <Button
                                            size="xsm"
                                            variant="ghost"
                                            icon={
                                                <Close size={16} color="#f8f8f8" />
                                            }
                                            onClick={() => {
                                                setTagSet(
                                                    pDataDraft.tag_set.filter(
                                                        (tag: PanelSeriesDefinition) =>
                                                            tag.key !== item.key,
                                                    ),
                                                );
                                            }}
                                        />
                                    )}
                                </Page.DpRow>
                            </Page.ContentBlock>
                        </Page>
                    );
                })}
            {isModal && (
                <AddTagsModal
                    key={pAvailableSourceTableNames.join('\u0000')}
                    pCloseModal={() => setIsModal(false)}
                    pTagSet={pDataDraft.tag_set}
                    pOnChangeTagSet={setTagSet}
                    pAvailableSourceTableNames={pAvailableSourceTableNames}
                />
            )}
            <Button
                variant="secondary"
                size="sm"
                shadow
                autoFocus={false}
                icon={<PlusCircle size={16} />}
                title="Click to add a new series"
                aria-label="Click to add a new series"
                onClick={() => setIsModal(true)}
            >
                Add new series
            </Button>
        </>
    );
};

export default EditorDataTab;
