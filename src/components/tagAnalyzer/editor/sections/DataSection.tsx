import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTagsModal from '../AddTagsModal';
import { Tooltip } from 'react-tooltip';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../../TagAnalyzerUtils';
import type { SeriesConfig } from '../../common/CommonTypes';
import type { TagAnalyzerPanelDataConfig } from '../PanelEditorTypes';
import {
    getSourceTagName,
    withNormalizedSourceTagName,
} from '../../utils/legacy/LegacyUtils';

// Used by DataSection to type editable tag field.
type EditableTagField = 'calculationMode' | 'alias' | 'color';

// Manages the tag list assigned to a panel.
// It lets the user review tags, update aliases and calculation modes, and open the add-tag flow.
const DataSection = ({
    pDataConfig,
    pOnChangeTagSet,
}: {
    pDataConfig: TagAnalyzerPanelDataConfig;
    pOnChangeTagSet: (aTagSet: SeriesConfig[]) => void;
}) => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };
    const closeModal = () => {
        setIsModal(false);
    };

    const removeTag = (aKey: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.filter((aItem: SeriesConfig) => aItem.key !== aKey),
        );
    };

    const updateTagField = (aKey: string, aField: EditableTagField, aValue: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((aItem: SeriesConfig) => {
                return aItem.key === aKey ? { ...aItem, [aField]: aValue } : aItem;
            }),
        );
    };

    const updateSourceTagName = (aKey: string, aValue: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((aItem: SeriesConfig) => {
                return aItem.key === aKey
                    ? withNormalizedSourceTagName({ ...aItem, sourceTagName: aValue })
                    : aItem;
            }),
        );
    };

    return (
        <>
            {pDataConfig.index_key &&
                pDataConfig.tag_set.map((aItem: SeriesConfig) => {
                    return (
                        <Page
                            key={aItem.key}
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
                                        value={aItem.calculationMode ?? 'avg'}
                                        onChange={(value: string) =>
                                            updateTagField(aItem.key, 'calculationMode', value)
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
                                                className={`taz-table-name-tooltip-${aItem.table}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                Source Tag Name
                                                <span style={{ fontSize: '10px' }}>
                                                    ({aItem.table})
                                                </span>
                                                <Tooltip
                                                    anchorSelect={`.taz-table-name-tooltip-${aItem.table}`}
                                                    content={aItem.table}
                                                    key={undefined}
                                                />
                                            </span>
                                        }
                                        labelPosition="left"
                                        value={getSourceTagName(aItem)}
                                        onChange={(aEvent) =>
                                            updateSourceTagName(aItem.key, aEvent.target.value)
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
                                        value={aItem.alias}
                                        onChange={(aEvent) =>
                                            updateTagField(aItem.key, 'alias', aEvent.target.value)
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
                                        color={aItem.color}
                                        onChange={(aColor: string) =>
                                            updateTagField(aItem.key, 'color', aColor)
                                        }
                                        tooltipId={aItem.id + '-block-color'}
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
                                            onClick={() => removeTag(aItem.key)}
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
                    pCloseModal={closeModal}
                    pTagSet={pDataConfig.tag_set}
                    pOnChangeTagSet={pOnChangeTagSet}
                    key={undefined}
                />
            )}
            <Button
                variant="secondary"
                fullWidth
                shadow
                autoFocus={false}
                icon={<PlusCircle size={16} key={undefined} />}
                onClick={openModal}
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

export default DataSection;
