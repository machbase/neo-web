import { useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input, Dropdown, ColorPicker, Page, Button } from '@/design-system/components';
import AddTag from './AddTag';
import { Tooltip } from 'react-tooltip';
import { avgMode } from '../../constants';

const Data = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };
    const closeModal = () => {
        setIsModal(false);
    };

    const removeTag = (aKey: string) => {
        pSetCopyPanelInfo({ ...pPanelInfo, tag_set: pPanelInfo.tag_set.filter((aItem: any) => aItem.key !== aKey) });
    };
    const changedTagInfo = (aEvent: any, aKey: string, aType: string) => {
        pSetCopyPanelInfo({
            ...pPanelInfo,
            tag_set: pPanelInfo.tag_set.map((aItem: any) => {
                return aItem.key === aKey ? { ...aItem, [aType]: aEvent.target.value } : aItem;
            }),
        });
    };

    return (
        <>
            {pPanelInfo.index_key &&
                pPanelInfo.tag_set.map((aItem: any) => {
                    return (
                        <Page key={aItem.key} style={{ borderRadius: '4px', border: '1px solid #b8c8da41', gap: '6px', height: 'auto', display: 'table' }}>
                            <Page.ContentBlock style={{ padding: '4px', flexWrap: 'wrap' }} pHoverNone>
                                <Page.DpRow style={{ width: '100%', paddingBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                                    <Dropdown.Root
                                        options={avgMode.map((aItem) => ({ label: aItem.value, value: aItem.value }))}
                                        value={aItem.calculationMode ?? 'avg'}
                                        onChange={(value: string) => changedTagInfo({ target: { value } } as any, aItem.key, 'calculationMode')}
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
                                                Tag Names
                                                <span style={{ fontSize: '10px' }}>({aItem.table})</span>
                                                <Tooltip anchorSelect={`.taz-table-name-tooltip-${aItem.table}`} content={aItem.table} />
                                            </span>
                                        }
                                        labelPosition="left"
                                        value={aItem.tagName}
                                        onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'tagName')}
                                        size="md"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <Input
                                        label="Alias"
                                        labelPosition="left"
                                        value={aItem.alias}
                                        onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'alias')}
                                        size="sm"
                                        style={{ width: '120px', height: '30px' }}
                                    />
                                    <ColorPicker
                                        color={aItem.color}
                                        onChange={(aColor: string) => changedTagInfo({ target: { value: aColor } } as any, aItem.key, 'color')}
                                        tooltipId={aItem.id + '-block-color'}
                                        tooltipContent="Color"
                                    />
                                    {pPanelInfo.tag_set.length !== 1 && (
                                        <Button size="xsm" variant="ghost" icon={<Close size={16} color="#f8f8f8" />} onClick={() => removeTag(aItem.key)} />
                                    )}
                                </Page.DpRow>
                            </Page.ContentBlock>
                        </Page>
                    );
                })}
            {isModal && <AddTag pCloseModal={closeModal} pPanelInfo={pPanelInfo} pSetCopyPanelInfo={pSetCopyPanelInfo} />}
            <Button variant="secondary" fullWidth shadow autoFocus={false} icon={<PlusCircle size={16} />} onClick={openModal} style={{ height: '60px' }} />
        </>
    );
};

export default Data;
