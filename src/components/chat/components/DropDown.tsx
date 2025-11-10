import './DropDown.scss';
import { useState, useEffect, useRef } from 'react';
import { ArrowDown, Delete } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';
import useEsc from '@/hooks/useEsc';
import { Model, ModelListType, WsRPC } from '@/utils/websocket';
import { Skeleton, SkeletonLabel } from './Skeleton';
import { ModelModal } from '../ModelModal';
import { ProviderModal } from '../ProviderModal';
import { ConfirmModal } from '../../modal/ConfirmModal';
import { useWebSocket } from '@/context/WebSocketContext';

interface ModelDropDownProps {
    pPosition?: 'BOTTOM' | 'TOP';
    pList: ModelListType[];
    pSelectedItem: Model;
    onSelect: (value: Model) => void;
    onFetch: () => void;
}

const MODEL_DROPDOWN_UNIQUE_ID = 'model-dropdown';
const MODEL_DROPDOWN_INDEX_ID = 1000;

export const ModelDropDown = ({ pPosition = 'TOP', pList, pSelectedItem, onSelect, onFetch }: ModelDropDownProps) => {
    const [sShowLang, setShowLang] = useState<boolean>(false);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sRmModel, setRmModel] = useState<Model>({ provider: '', model: '', name: '' });
    const [sIsModelModal, setIsModelModal] = useState<boolean>(false);
    const [sIsProviderModal, setIsProviderModal] = useState<boolean>(false);
    const dropDownRef = useRef(null);
    const { sendMSG } = useWebSocket();

    const handleSelect = (item: Model) => {
        onSelect?.(item);
        setShowLang(false);
    };

    const handleToggle = () => {
        if (!sShowLang) {
            setIsLoading(true);
            setShowLang(!sShowLang);
            onFetch();
        } else setShowLang(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, model: Model) => {
        e.stopPropagation();
        setRmModel(model);
        setIsDeleteModal(true);
        setShowLang(false);
    };
    const delModel = () => {
        const sGenObj = WsRPC.LLM.GenModelRmObj(MODEL_DROPDOWN_UNIQUE_ID, MODEL_DROPDOWN_INDEX_ID, sRmModel);
        setRmModel({ provider: '', model: '', name: '' });
        setIsDeleteModal(false);
        sendMSG(sGenObj);
    };
    const closeHelper = () => {
        setShowLang(false);
    };

    useEffect(() => {
        if (pList && pList?.length > 0) setIsLoading(false);
    }, [pList]);

    useOutsideClick(dropDownRef, () => closeHelper());
    useEsc(() => setShowLang(false));

    return (
        <div ref={dropDownRef} className="dropdown-container">
            <div className="dropdown-content" onClick={handleToggle}>
                <div className="dropdown-title">
                    <span>{pSelectedItem.name === '' || !pSelectedItem.name ? 'Please select' : pSelectedItem.name}</span>
                </div>
                <ArrowDown size={16} style={{ transform: sShowLang ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />
            </div>
            {sShowLang && (
                <div className="dropdown-menu" style={pPosition === 'BOTTOM' ? { bottom: '-8px' } : { top: '0' }}>
                    {sIsLoading ? (
                        <>
                            <SkeletonLabel pStyle={{ minHeight: '8px', maxHeight: '8px' }} />
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                            <SkeletonLabel pStyle={{ minHeight: '8px', maxHeight: '8px' }} />
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                        </>
                    ) : (
                        <>
                            {pList?.map((aItem: ModelListType, aIdx: number) => {
                                if (!aItem?.exist || aItem?.items?.length === 0) return null;
                                return (
                                    <div className="dropdown-menu-body" key={aItem.label + aIdx.toString()}>
                                        <div className="dropdown-menu-label">{aItem.label}</div>
                                        {aItem.items?.map((bItem, bIdx: number) => {
                                            const isSelected =
                                                bItem.name === pSelectedItem.name && bItem.provider === pSelectedItem.provider && bItem.model === pSelectedItem.model;
                                            return (
                                                <div key={aItem.label + bItem.name + aIdx.toString() + bIdx.toString()} className="dropdown-menu-item-wrap">
                                                    <div
                                                        className={`dropdown-menu-item ${isSelected ? 'selected' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSelect(bItem);
                                                        }}
                                                    >
                                                        <span className="dropdown-menu-item-name" style={{ whiteSpace: 'nowrap' }}>
                                                            {bItem.name}
                                                        </span>
                                                    </div>
                                                    <div className="dropdown-menu-item-delete" onClick={(e) => handleDeleteClick(e, bItem)}>
                                                        <Delete />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {pList?.some((item) => item?.exist && item?.items?.length > 0) && <div className="divider" />}
                        </>
                    )}
                    <div className="dropdown-menu-footer">
                        {sIsLoading ? (
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                        ) : (
                            <>
                                <div
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                        setIsModelModal(!sIsModelModal);
                                        setShowLang(false);
                                    }}
                                >
                                    Add model
                                </div>
                                <div
                                    className="dropdown-menu-item"
                                    onClick={() => {
                                        setIsProviderModal(!sIsProviderModal);
                                        setShowLang(false);
                                    }}
                                >
                                    Set provider
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {sIsDeleteModal && (
                <ConfirmModal pIsDarkMode setIsOpen={setIsDeleteModal} pCallback={delModel} pContents={<div className="body-content">{`Do you want to delete this model?`}</div>} />
            )}
            {sIsModelModal && <ModelModal pCallback={() => setIsModelModal(false)} />}
            {sIsProviderModal && <ProviderModal pCallback={() => setIsProviderModal(false)} />}
        </div>
    );
};
