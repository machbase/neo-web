import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTagsModal from '../../../modal/selectionPanel/AddTagsModal';
import { Tooltip } from 'react-tooltip';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../../../domain/SeriesModel';
import type { PanelSeriesDefinition } from '../../../domain/SeriesModel';
import { getPanelSeriesDisplayColor } from '../../../series/PanelSeriesUtils';
import type {
    EditableTagField,
    PanelDataConfig,
} from '../EditorTypes';

const EditorDataTab = ({
    pDataConfig,
    pOnChangeTagSet,
    pAvailableSourceTableNames,
}: {
    pDataConfig: PanelDataConfig;
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
    pAvailableSourceTableNames: string[];
}) => {
    const [isModal, setIsModal] = useState(false);

    const updateTagField = (key: string, field: EditableTagField, value: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((item: PanelSeriesDefinition) => {
                return item.key === key ? { ...item, [field]: value } : item;
            }),
        );
    };

    const updateSourceTagName = (key: string, value: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((item: PanelSeriesDefinition) => {
                return item.key === key ? { ...item, sourceTagName: value } : item;
            }),
        );
    };

    return (
        <>
            {pDataConfig.index_key &&
                pDataConfig.tag_set.map((item: PanelSeriesDefinition, seriesIndex: number) => {
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
                            pRef={undefined}
                            className={undefined}
                        >
                            <Page.ContentBlock
                                style={{ padding: '4px', flexWrap: 'wrap' }}
                                pHoverNone
                                pActive={undefined}
                                pSticky={undefined}
                            >
                                <Page.DpRow
                                    style={{
                                        width: '100%',
                                        paddingBottom: '8px',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                    }}
                                    className={undefined}
                                >
                                    <Dropdown.Root
                                        options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                                        value={item.calculationMode ?? 'avg'}
                                        onChange={(value: string) =>
                                            updateTagField(item.key, 'calculationMode', value)
                                        }
                                        label="Calc Mode"
                                        labelPosition="left"
                                        className={undefined}
                                        fullWidth={undefined}
                                        style={undefined}
                                        defaultValue={undefined}
                                        onOpenChange={undefined}
                                        disabled={undefined}
                                        placeholder={undefined}
                                    >
                                        <Dropdown.Trigger
                                            style={{ width: '120px' }}
                                            className={undefined}
                                            children={undefined}
                                        />
                                        <Dropdown.Menu className={undefined} key={undefined}>
                                            <Dropdown.List
                                                children={undefined}
                                                className={undefined}
                                                key={undefined}
                                            />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
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
                                                    key={undefined}
                                                />
                                            </span>
                                        }
                                        labelPosition="left"
                                        value={item.sourceTagName}
                                        onChange={(event) =>
                                            updateSourceTagName(item.key, event.target.value)
                                        }
                                        size="md"
                                        style={{ width: '120px', height: '30px' }}
                                        variant={undefined}
                                        error={undefined}
                                        helperText={undefined}
                                        fullWidth={undefined}
                                        leftIcon={undefined}
                                        rightIcon={undefined}
                                    />
                                    <Input
                                        label="Alias"
                                        labelPosition="left"
                                        value={item.alias}
                                        onChange={(event) =>
                                            updateTagField(item.key, 'alias', event.target.value)
                                        }
                                        size="sm"
                                        style={{ width: '120px', height: '30px' }}
                                        variant={undefined}
                                        error={undefined}
                                        helperText={undefined}
                                        fullWidth={undefined}
                                        leftIcon={undefined}
                                        rightIcon={undefined}
                                    />
                                    <ColorPicker
                                        color={sSeriesColor}
                                        onChange={(color: string) =>
                                            updateTagField(item.key, 'color', color)
                                        }
                                        tooltipId={item.id + '-block-color'}
                                        tooltipContent="Color"
                                        disabled={undefined}
                                        className={undefined}
                                        key={undefined}
                                    />
                                    {pDataConfig.tag_set.length !== 1 && (
                                        <Button
                                            size="xsm"
                                            variant="ghost"
                                            icon={
                                                <Close size={16} color="#f8f8f8" key={undefined} />
                                            }
                                            onClick={() => {
                                                pOnChangeTagSet(
                                                    pDataConfig.tag_set.filter(
                                                        (tag: PanelSeriesDefinition) =>
                                                            tag.key !== item.key,
                                                    ),
                                                );
                                            }}
                                            loading={undefined}
                                            active={undefined}
                                            iconPosition={undefined}
                                            fullWidth={undefined}
                                            children={undefined}
                                            isToolTip={undefined}
                                            toolTipContent={undefined}
                                            toolTipPlace={undefined}
                                            toolTipMaxWidth={undefined}
                                            forceOpacity={undefined}
                                            shadow={undefined}
                                            label={undefined}
                                            labelPosition={undefined}
                                        />
                                    )}
                                </Page.DpRow>
                            </Page.ContentBlock>
                        </Page>
                    );
                })}
            {isModal && (
                <AddTagsModal
                    pCloseModal={() => setIsModal(false)}
                    pTagSet={pDataConfig.tag_set}
                    pOnChangeTagSet={pOnChangeTagSet}
                    pAvailableSourceTableNames={pAvailableSourceTableNames}
                    key={undefined}
                />
            )}
            <Button
                variant="secondary"
                fullWidth
                shadow
                autoFocus={false}
                icon={<PlusCircle size={16} key={undefined} />}
                onClick={() => setIsModal(true)}
                style={{ height: '60px' }}
                size={undefined}
                loading={undefined}
                active={undefined}
                iconPosition={undefined}
                children={undefined}
                isToolTip={undefined}
                toolTipContent={undefined}
                toolTipPlace={undefined}
                toolTipMaxWidth={undefined}
                forceOpacity={undefined}
                label={undefined}
                labelPosition={undefined}
            />
        </>
    );
};

export default EditorDataTab;
