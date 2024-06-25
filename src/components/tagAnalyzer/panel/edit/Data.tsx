import { useRef, useState } from 'react';
import { PlusCircle, Close } from '@/assets/icons/Icon';
import { Input } from '@/components/inputs/Input';
import AddTag from './AddTag';
import './Data.scss';
import { Select } from '@/components/inputs/Select';
import { CompactPicker } from 'react-color';
import useOutsideClick from '@/hooks/useOutsideClick';
import { IconButton } from '@/components/buttons/IconButton';

const Data = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const [isModal, setIsModal] = useState(false);

    const openModal = () => {
        setIsModal(true);
    };
    const closeModal = () => {
        setIsModal(false);
    };
    const avgMode = [
        { key: 'Min', value: 'min' },
        { key: 'Max', value: 'max' },
        { key: 'Sum', value: 'sum' },
        { key: 'Count', value: 'cnt' },
        { key: 'Average', value: 'avg' },
    ];
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
        <div className="data-form">
            <div>Tags</div>
            {pPanelInfo.index_key &&
                pPanelInfo.tag_set.map((aItem: any) => {
                    return (
                        <div key={aItem.key} className="tag-list">
                            <div className="set-mode">
                                <div className="calc-mode">
                                    <span className="calc-mode-title">Calc Mode</span>
                                    <Select
                                        pInitValue={aItem.calculationMode ?? 'avg'}
                                        pWidth={120}
                                        pHeight={25}
                                        onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'calculationMode')}
                                        pOptions={avgMode.map((aItem) => aItem.value)}
                                    />
                                </div>
                                <div className="tag-names">
                                    <span className="tag-names-title">
                                        Tag Names
                                        <span style={{ fontSize: '10px', marginLeft: '4px', marginBottom: '2px' }}>({aItem.table})</span>
                                    </span>
                                    <Input
                                        pWidth={240}
                                        pHeight={24}
                                        pValue={aItem.tagName}
                                        pSetValue={() => null}
                                        onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'tagName')}
                                    />
                                </div>
                                <div className="alias">
                                    <span className="alias-title">Alias</span>
                                    <Input
                                        pWidth={120}
                                        pHeight={24}
                                        pValue={aItem.alias}
                                        pSetValue={() => null}
                                        onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'alias')}
                                    />
                                </div>
                                <ColorBlock pItem={aItem} pCallback={(aColor: string) => changedTagInfo({ target: { value: aColor } } as any, aItem.key, 'color')} />
                            </div>
                            <div className="close">{pPanelInfo.tag_set.length !== 1 && <Close onClick={() => removeTag(aItem.key)} color="#f8f8f8"></Close>}</div>
                        </div>
                    );
                })}
            <div className="add-tag tag-list" onClick={openModal}>
                <PlusCircle size="23px" color="#FDB532"></PlusCircle>
            </div>
            {isModal && <div className="backdrop" onClick={closeModal}></div>}
            {isModal && <AddTag pCloseModal={closeModal} pPanelInfo={pPanelInfo} pSetCopyPanelInfo={pSetCopyPanelInfo} />}
        </div>
    );
};

const ColorBlock = ({ pItem, pCallback }: { pItem: any; pCallback: (aColor: string) => void }) => {
    const sColorPickerRef = useRef<any>(null);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

    return (
        <div ref={sColorPickerRef} style={{ position: 'relative' }}>
            <IconButton
                pWidth={20}
                pHeight={20}
                pIsToopTip
                pToolTipContent={'Color'}
                pToolTipId={pItem.id + '-block-color'}
                pIcon={<div style={{ width: '14px', cursor: 'pointer', height: '14px', marginRight: '4px', borderRadius: '50%', backgroundColor: pItem.color }}></div>}
                onClick={() => setIsColorPicker(!sIsColorPicker)}
            />

            {sIsColorPicker && (
                <div className="color-picker" style={{ position: 'absolute', zIndex: 1, top: '20px', left: '0px' }}>
                    <CompactPicker color={pItem.color} onChangeComplete={(aInfo: any) => pCallback(aInfo.hex)} />
                </div>
            )}
        </div>
    );
};

export default Data;
