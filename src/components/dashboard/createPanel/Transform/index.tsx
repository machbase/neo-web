import './index.scss';
import { BadgeSelect, BadgeSelectorItemType } from '@/components/inputs/BadgeSelector';
import { Close, PlusCircle } from '@/assets/icons/Icon';
import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/inputs/Input';
import { IconButton } from '@/components/buttons/IconButton';
import useOutsideClick from '@/hooks/useOutsideClick';
import CompactPicker from 'react-color/lib/components/compact/Compact';
import { generateUUID } from '@/utils';
import { TransformBlockKeyType, TransformBlockType } from './type';
import TQL from '@/utils/TqlGenerator';
import { getTqlChart } from '@/api/repository/machiot';
import { Error } from '@/components/toast/Toast';
import { BadgeStatus } from '@/components/badge';
import { RxQuestionMark } from 'react-icons/rx';
import { TRX_REPLACE_LIST } from '@/utils/Chart/TransformDataParser';

const colorList = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#F44336', // Red
    '#9C27B0', // Purple
    '#3F51B5', // Indigo
    '#00BCD4', // Cyan
    '#FFC107', // Amber
    '#8BC34A', // Light Green
    '#E91E63', // Pink
    '#607D8B', // Blue Grey
];

export const Transform = ({ pPanelOption, pSetPanelOption }: { pPanelOption: any; pSetPanelOption: React.Dispatch<React.SetStateAction<any>> }) => {
    function handleTransformBlockItem(aKey: TransformBlockKeyType, aValue: boolean | string | BadgeSelectorItemType, aIdx: number) {
        const tmpTransformBlockList: TransformBlockType[] = JSON.parse(JSON.stringify(pPanelOption.transformBlockList));
        if (typeof aValue === 'string' || typeof aValue === 'boolean') tmpTransformBlockList[aIdx][aKey] = aValue;
        else {
            if (tmpTransformBlockList[aIdx].selectedBlockIdxList.includes(aValue.idx))
                tmpTransformBlockList[aIdx].selectedBlockIdxList = tmpTransformBlockList[aIdx].selectedBlockIdxList.filter((item: number) => item !== aValue.idx);
            else tmpTransformBlockList[aIdx].selectedBlockIdxList.push(aValue.idx);
        }
        pSetPanelOption({ ...pPanelOption, transformBlockList: tmpTransformBlockList });
    }
    const handleTransformBlock = (aMode: 'ADD' | 'DELETE', aIdx: number) => {
        let tmpTransformBlockList: TransformBlockType[] = [];
        if (aMode === 'ADD') {
            tmpTransformBlockList = [
                ...(pPanelOption.transformBlockList ?? []),
                {
                    id: generateUUID(),
                    alias: '',
                    color: colorList[pPanelOption?.transformBlockList?.length ?? 0],
                    value: '',
                    valid: undefined, // check formula valid
                    selectedBlockIdxList: [],
                },
            ];
        } else {
            const newList = [...pPanelOption.transformBlockList];
            newList.splice(aIdx, 1);
            tmpTransformBlockList = newList;
        }
        pSetPanelOption({ ...pPanelOption, transformBlockList: tmpTransformBlockList });
    };
    const getBlockList = useMemo((): any[] => {
        return (
            pPanelOption?.blockList?.map((block: any, idx: number) => ({
                name: TRX_REPLACE_LIST[idx],
                color: block.color,
                idx: idx,
            })) ?? []
        );
    }, [pPanelOption?.blockList]);

    return (
        <div className="transform-data-wrap">
            {(pPanelOption.transformBlockList as TransformBlockType[])?.map((item, index) => {
                return (
                    <TransformBlock
                        key={'transform-block-' + item.id + ''}
                        pTransformItem={item}
                        pQueryBlockList={getBlockList}
                        handleBlock={() => handleTransformBlock('DELETE', index)}
                        handleItem={(aKey, aValue) => handleTransformBlockItem(aKey, aValue, index)}
                    />
                );
            })}
            <TransformAddBlock
                isDisable={
                    pPanelOption.chartOptions?.tagLimit
                        ? pPanelOption.chartOptions?.tagLimit - (pPanelOption?.blockList?.length ?? 0) <= pPanelOption?.transformBlockList?.length
                        : 12 - (pPanelOption?.blockList?.length ?? 0) <= pPanelOption?.transformBlockList?.length
                }
                callback={() => handleTransformBlock('ADD', pPanelOption?.transformBlockList?.length ?? 0)}
            />
        </div>
    );
};

const TransformBlock = ({
    pTransformItem,
    pQueryBlockList,
    handleBlock,
    handleItem,
}: {
    pTransformItem: TransformBlockType;
    pQueryBlockList: any;
    handleBlock: () => void;
    handleItem: (aKey: TransformBlockKeyType, aValue: boolean | string | BadgeSelectorItemType) => void;
}) => {
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);
    const sColorPickerRef = useRef<any>(null);

    const handleFormula = async () => {
        if (pTransformItem?.selectedBlockIdxList.length > 0) {
            let sMapValue = pTransformItem.value;
            pTransformItem.selectedBlockIdxList.map((blockIdx: number, aIdx: number) => {
                if (pQueryBlockList[blockIdx]) sMapValue = sMapValue.replaceAll(new RegExp(`\\b${pQueryBlockList[blockIdx].name}\\b`, 'g'), `value(${aIdx})`);
            });

            const src = TQL.SRC.FAKE('json', `{[${Array.from({ length: pTransformItem.selectedBlockIdxList.length }).fill(1)}]}`);
            const map = TQL.MAP.MAPVALUE(1, sMapValue);
            const sink = TQL.SINK._JSON();

            const sResult: any = await getTqlChart(`${src}\n${map}\n${sink}`);
            if (!sResult?.data?.success || !sResult?.data?.data?.rows?.length) {
                Error('Please check the entered formula.');
                handleItem('valid', false);
            } else handleItem('valid', true);
        }
    };

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));
    return (
        <div className="transform-block-wrap">
            <div className="transform-block-alias">
                <div className="transform-block">
                    <span className="transform-block-title"> Alias </span>
                    <Input
                        pBorderRadius={4}
                        pWidth={175}
                        pHeight={26}
                        pType="text"
                        pValue={pTransformItem.alias}
                        pSetValue={() => null}
                        onChange={(aEvent) => handleItem('alias', aEvent.target.value)}
                    />
                </div>
                <div className="transform-block">
                    <IconButton pWidth={20} pHeight={20} pIcon={<RxQuestionMark />} onClick={() => window.open('https://docs.machbase.com/neo/tql/utilities/#math', '_blank')} />
                    <div ref={sColorPickerRef} style={{ position: 'relative' }}>
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={'Color'}
                            pIcon={
                                <div
                                    style={{
                                        width: '14px',
                                        cursor: 'pointer',
                                        height: '14px',
                                        marginRight: '4px',
                                        borderRadius: '50%',
                                        border: 'solid 0.5px rgb(255 255 255 / 50%)',
                                        backgroundColor: pTransformItem.color,
                                    }}
                                />
                            }
                            onClick={() => setIsColorPicker(!sIsColorPicker)}
                        />

                        {sIsColorPicker && (
                            <div className="color-picker" style={{ right: 0, position: 'absolute', zIndex: 10 }}>
                                <CompactPicker color={pTransformItem.color} onChangeComplete={(aInfo: any) => handleItem('color', aInfo.hex)} />
                            </div>
                        )}
                    </div>
                    <IconButton pWidth={20} pHeight={20} pIcon={<Close />} onClick={handleBlock} />
                </div>
            </div>
            <div className="divider" />
            <div className="transform-block">
                <span className="transform-block-title"> Query </span>
                <BadgeSelect pSelectedList={pTransformItem.selectedBlockIdxList ?? []} pList={pQueryBlockList} pCallback={(aItem) => handleItem('selectBlockIdx', aItem)} />
            </div>
            <div className="divider" />
            <div className="transform-block">
                <span className="transform-block-title" style={{ display: 'flex', gap: '4px', alignItems: 'start' }}>
                    Formula
                    {pTransformItem.valid !== undefined && !pTransformItem.valid && (
                        <div style={{ marginTop: '3px' }}>
                            <BadgeStatus />
                        </div>
                    )}
                </span>
                <textarea
                    placeholder={''}
                    defaultValue={pTransformItem.value}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleItem('value', event.target.value)}
                    onBlur={handleFormula}
                />
            </div>
        </div>
    );
};

const TransformAddBlock = ({ isDisable, callback }: { isDisable: boolean; callback: () => void }) => {
    return (
        <div className="plus-wrap" style={isDisable ? { opacity: 0.7, pointerEvents: 'none' } : {}} onClick={callback}>
            <PlusCircle color="#FDB532" />
        </div>
    );
};
