import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTagsModal from '../AddTagsModal';
import { Tooltip } from 'react-tooltip';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../../utils/series/PanelSeriesAggregationConstants';
import type { PanelSeriesConfig } from '../../utils/series/PanelSeriesTypes';
import { getPanelSeriesDisplayColor } from '../../utils/series/PanelSeriesColorResolver';
import type {
    EditableTagField,
    EditorDataTabProps,
} from '../EditorTypes';

/**
 * Manages the tag list assigned to a panel.
 * Intent: Let the user review tags, update aliases and calculation modes, and open the add-tag flow.
 * @param {PanelDataConfig} pDataConfig The current data config.
 * @param {(aTagSet: PanelSeriesConfig[]) => void} pOnChangeTagSet Updates the current tag set.
 * @returns {JSX.Element}
 */
const EditorDataTab = ({
    pDataConfig,
    pOnChangeTagSet,
    pTables,
}: EditorDataTabProps) => {
    const [isModal, setIsModal] = useState(false);

    /**
     * Updates one editable field on one tag.
     * Intent: Keep alias, calculation mode, and color edits in one shared update path.
     * @param {string} key The tag key to update.
     * @param {EditableTagField} field The editable field to update.
     * @param {string} value The new field value.
     * @returns {void}
     */
    const updateTagField = (key: string, field: EditableTagField, value: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((item: PanelSeriesConfig) => {
                return item.key === key ? { ...item, [field]: value } : item;
            }),
        );
    };

    /**
     * Updates one tag's normalized source tag name and removes any stale legacy tag-name field.
     * Intent: Keep editor writes on the normalized series shape instead of routing through legacy adapters.
     * @param {string} key The tag key to update.
     * @param {string} value The new source tag name.
     * @returns {void}
     */
    const updateSourceTagName = (key: string, value: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((item: PanelSeriesConfig) => {
                if (item.key !== key) {
                    return item;
                }

                const { tagName, ...sNormalizedTag } = item;
                void tagName;

                return {
                    ...sNormalizedTag,
                    sourceTagName: value,
                };
            }),
        );
    };

    return (
        <>
            {pDataConfig.index_key &&
                pDataConfig.tag_set.map((item: PanelSeriesConfig, seriesIndex: number) => {
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
                                                        (tag: PanelSeriesConfig) =>
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
                    pTables={pTables}
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
