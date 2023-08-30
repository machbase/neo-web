import { useState } from 'react';
import { PlusCircle, Close, ArrowDown } from '@/assets/icons/Icon';
import { Input } from '@/components/inputs/Input';
import AddTag from './AddTag';
import './Data.scss';
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
                                    <div className="select-option">
                                        <select onChange={(aEvent: any) => changedTagInfo(aEvent, aItem.key, 'calculationMode')} defaultValue={aItem.calculationMode}>
                                            {avgMode.map((bItem: any) => {
                                                return (
                                                    <option key={bItem.value} value={bItem.value}>
                                                        {bItem.key}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <ArrowDown></ArrowDown>
                                    </div>
                                </div>
                                <div className="tag-names">
                                    <span className="tag-names-title">
                                        Tag Names
                                        <span style={{ fontSize: '10px', marginLeft: '4px', marginBottom: '2px' }}>({aItem.table})</span>
                                    </span>
                                    <Input
                                        pWidth={120}
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

export default Data;
