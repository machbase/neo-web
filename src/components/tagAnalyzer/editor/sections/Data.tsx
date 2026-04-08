import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTagsModal from '../AddTagsModal';
import { Tooltip } from 'react-tooltip';
import { TAG_ANALYZER_AGGREGATION_MODES } from '../../TagAnalyzerConstants';
import type { TagAnalyzerTagItem } from '../../panel/TagAnalyzerPanelModelTypes';
import type { TagAnalyzerPanelDataConfig } from '../PanelEditorTypes';
import { getSourceTagName, withNormalizedSourceTagName } from '../../TagAnalyzerSeriesNaming';

type EditableTagField = 'calculationMode' | 'alias' | 'color';

// Manages the tag list assigned to a panel.
// It lets the user review tags, update aliases and calculation modes, and open the add-tag flow.
const Data = ({
    pDataConfig,
    pOnChangeTagSet,
}: {
    pDataConfig: TagAnalyzerPanelDataConfig;
    pOnChangeTagSet: (aTagSet: TagAnalyzerTagItem[]) => void;
}) => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };
    const closeModal = () => {
        setIsModal(false);
    };

    const removeTag = (aKey: string) => {
        pOnChangeTagSet(pDataConfig.tag_set.filter((aItem: TagAnalyzerTagItem) => aItem.key !== aKey));
    };

    const updateTagField = (aKey: string, aField: EditableTagField, aValue: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((aItem: TagAnalyzerTagItem) => {
                return aItem.key === aKey ? { ...aItem, [aField]: aValue } : aItem;
            })
        );
    };

    const updateSourceTagName = (aKey: string, aValue: string) => {
        pOnChangeTagSet(
            pDataConfig.tag_set.map((aItem: TagAnalyzerTagItem) => {
                return aItem.key === aKey ? withNormalizedSourceTagName({ ...aItem, sourceTagName: aValue }) : aItem;
            })
        );
    };

    return (
        <>
            {pDataConfig.index_key &&
                pDataConfig.tag_set.map((aItem: TagAnalyzerTagItem) => {
                    return (
                        <Page key={aItem.key} style={{ borderRadius: '4px', border: '1px solid #b8c8da41', gap: '6px', height: 'auto', display: 'table' }}>
                            <Page.ContentBlock style={{ padding: '4px', flexWrap: 'wrap' }} pHoverNone>
                                <Page.DpRow style={{ width: '100%', paddingBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                                    <Dropdown.Root
                                        options={TAG_ANALYZER_AGGREGATION_MODES.map((aItem) => ({ label: aItem.value, value: aItem.value }))}
                                        value={aItem.calculationMode ?? 'avg'}
                                        onChange={(value: string) => updateTagField(aItem.key, 'calculationMode', value)}
                                        label="Calc Mode"
                                        labelPosition="left"
                                    >
                                        <Dropdown.Trigger style={{ width: '120px' }} />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                    <Input
                                        label={
                                            <span className={`taz-table-name-tooltip-${aItem.table}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Source Tag Name
                                                <span style={{ fontSize: '10px' }}>({aItem.table})</span>
                                                <Tooltip anchorSelect={`.taz-table-name-tooltip-${aItem.table}`} content={aItem.table} />
                                            </span>
                                        }
                                        labelPosition="left"
                                        value={getSourceTagName(aItem)}
                                        onChange={(aEvent) => updateSourceTagName(aItem.key, aEvent.target.value)}
                                        size="md"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <Input
                                        label="Alias"
                                        labelPosition="left"
                                        value={aItem.alias}
                                        onChange={(aEvent) => updateTagField(aItem.key, 'alias', aEvent.target.value)}
                                        size="sm"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <ColorPicker
                                        color={aItem.color}
                                        onChange={(aColor: string) => updateTagField(aItem.key, 'color', aColor)}
                                        tooltipId={aItem.id + '-block-color'}
                                        tooltipContent="Color"
                                    />
                                    {pDataConfig.tag_set.length !== 1 && (
                                        <Button size="xsm" variant="ghost" icon={<Close size={16} color="#f8f8f8" />} onClick={() => removeTag(aItem.key)} />
                                    )}
                                </Page.DpRow>
                            </Page.ContentBlock>
                        </Page>
                    );
                })}
            {isModal && <AddTagsModal pCloseModal={closeModal} pTagSet={pDataConfig.tag_set} pOnChangeTagSet={pOnChangeTagSet} />}
            <Button variant="secondary" fullWidth shadow autoFocus={false} icon={<PlusCircle size={16} />} onClick={openModal} style={{ height: '60px' }} />
        </>
    );
};

export default Data;
