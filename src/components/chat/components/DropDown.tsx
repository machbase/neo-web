import { useState, useEffect } from 'react';
import { ArrowDown, Delete } from '@/assets/icons/Icon';
import { Model, ModelListType, WsRPC } from '@/utils/websocket';
import { Skeleton, SkeletonLabel } from './Skeleton';
import { ModelModal } from '../ModelModal';
import { ProviderModal } from '../ProviderModal';
import { ConfirmModal } from '../../modal/ConfirmModal';
import { useWebSocket } from '@/context/WebSocketContext';
import { Button, Menu } from '@/design-system/components';
import styles from './DropDown.module.scss';

interface ModelDropDownProps {
    pList: ModelListType[];
    pSelectedItem: Model;
    onSelect: (value: Model) => void;
    onFetch: () => void;
    style?: React.CSSProperties;
}

const MODEL_DROPDOWN_UNIQUE_ID = 'model-dropdown';
const MODEL_DROPDOWN_INDEX_ID = 1000;

export const ModelDropDown = ({ pList, pSelectedItem, onSelect, onFetch, style }: ModelDropDownProps) => {
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sRmModel, setRmModel] = useState<Model>({ provider: '', model: '', name: '' });
    const [sIsModelModal, setIsModelModal] = useState<boolean>(false);
    const [sIsProviderModal, setIsProviderModal] = useState<boolean>(false);
    const { sendMSG } = useWebSocket();

    const handleDeleteClick = (e: React.MouseEvent, model: Model) => {
        e.stopPropagation();
        setRmModel(model);
        setIsDeleteModal(true);
        // Close menu by simulating outside click
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    };

    const delModel = () => {
        const sGenObj = WsRPC.LLM.GenModelRmObj(MODEL_DROPDOWN_UNIQUE_ID, MODEL_DROPDOWN_INDEX_ID, sRmModel);

        // If deleting the currently selected model, reset selection
        if (sRmModel.name === pSelectedItem.name && sRmModel.provider === pSelectedItem.provider && sRmModel.model === pSelectedItem.model) {
            onSelect({ provider: '', model: '', name: '' });
        }

        setRmModel({ provider: '', model: '', name: '' });
        setIsDeleteModal(false);
        sendMSG(sGenObj);
    };

    useEffect(() => {
        if (pList && pList?.length > 0) setIsLoading(false);
    }, [pList]);

    const handleMenuOpen = () => {
        setIsLoading(true);
        onFetch();
    };

    return (
        <>
            <Menu.Root className={styles['dropdown-container']}>
                <Menu.Trigger>
                    <Button size="sm" variant="ghost" onClick={handleMenuOpen} style={style}>
                        <p>{pSelectedItem.name === '' || !pSelectedItem.name ? 'Please select' : pSelectedItem.name}</p>
                        <ArrowDown size={16} />
                    </Button>
                </Menu.Trigger>
                <Menu.Content className={styles['dropdown-menu']}>
                    {sIsLoading ? (
                        <div className={styles['dropdown-menu-loading']}>
                            <SkeletonLabel pStyle={{ minHeight: '8px', maxHeight: '8px' }} />
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                            <SkeletonLabel pStyle={{ minHeight: '8px', maxHeight: '8px' }} />
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                        </div>
                    ) : (
                        <>
                            {pList?.map((aItem: ModelListType, aIdx: number) => {
                                if (!aItem?.exist || aItem?.items?.length === 0) return null;
                                return (
                                    <div className={styles['dropdown-menu-body']} key={aItem.label + aIdx.toString()}>
                                        <div className={styles['dropdown-menu-label']}>{aItem.label}</div>
                                        {aItem.items?.map((bItem, bIdx: number) => {
                                            const isSelected =
                                                bItem.name === pSelectedItem.name && bItem.provider === pSelectedItem.provider && bItem.model === pSelectedItem.model;
                                            return (
                                                <div key={aItem.label + bItem.name + aIdx.toString() + bIdx.toString()} className={styles['dropdown-menu-item-wrap']}>
                                                    <Menu.Item className={isSelected ? 'selected' : ''} onClick={() => onSelect(bItem)}>
                                                        {bItem.name}
                                                    </Menu.Item>
                                                    <div className={styles['dropdown-menu-item-delete']} onClick={(e) => handleDeleteClick(e, bItem)}>
                                                        <Delete />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            {pList?.some((item) => item?.exist && item?.items?.length > 0) && <Menu.Divider />}
                        </>
                    )}
                    <div className={styles['dropdown-menu-footer']}>
                        {sIsLoading ? (
                            <Skeleton pLength={2} pStyle={{ minHeight: '20px', maxHeight: '20px' }} />
                        ) : (
                            <>
                                <Menu.Item onClick={() => setIsModelModal(true)}>Add model</Menu.Item>
                                <Menu.Item onClick={() => setIsProviderModal(true)}>Set provider</Menu.Item>
                            </>
                        )}
                    </div>
                </Menu.Content>
            </Menu.Root>
            {sIsDeleteModal && (
                <ConfirmModal pIsDarkMode setIsOpen={setIsDeleteModal} pCallback={delModel} pContents={<div className="body-content">{`Do you want to delete this model?`}</div>} />
            )}
            {sIsModelModal && <ModelModal isOpen={sIsModelModal} onClose={() => setIsModelModal(false)} />}
            {sIsProviderModal && <ProviderModal isOpen={sIsProviderModal} onClose={() => setIsProviderModal(false)} />}
        </>
    );
};
