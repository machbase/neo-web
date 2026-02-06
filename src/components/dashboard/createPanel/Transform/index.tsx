import './index.scss';
import { Close, PlusCircle } from '@/assets/icons/Icon';
import { useMemo, useState } from 'react';
import { generateUUID } from '@/utils';
import { TransformBlockKeyType, TransformBlockType } from './type';
import TQL from '@/utils/TqlGenerator';
import { getTqlChart } from '@/api/repository/machiot';
import { Toast } from '@/design-system/components';
import { BadgeStatus } from '@/components/badge';
import { RxQuestionMark } from 'react-icons/rx';
import { TRX_REPLACE_LIST } from '@/utils/Chart/TransformDataParser';
import { getChartSeriesName } from '@/utils/dashboardUtil';
import { TRX_FORMULA_EX } from './constants';
import { Tooltip } from 'react-tooltip';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';
import { Button, Page, Input as DSInput, Textarea, BadgeSelect, Modal, ColorPicker } from '@/design-system/components';
import type { BadgeSelectItem } from '@/design-system/components';

const colorList = [
    '#607D8B', // Blue Grey
    '#00BCD4', // Cyan
    '#3F51B5', // Indigo
    '#FFC107', // Amber
    '#9C27B0', // Purple
    '#8BC34A', // Light Green
    '#E91E63', // Pink
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#F44336', // Red
];

export const Transform = ({
    pPanelOption,
    pVariables,
    pSetPanelOption,
    pBlockCount,
}: {
    pPanelOption: any;
    pVariables: any;
    pSetPanelOption: React.Dispatch<React.SetStateAction<any>>;
    pBlockCount: any;
}) => {
    const [isModal, setIsModal] = useState<boolean>(false);

    function handleTransformBlockItem(aKey: TransformBlockKeyType, aValue: boolean | string | BadgeSelectItem, aIdx: number) {
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
        const sTmpPanelOpt = JSON.parse(JSON.stringify(pPanelOption));
        let tmpTransformBlockList: TransformBlockType[] = [];
        if (aMode === 'ADD') {
            const currentLength = sTmpPanelOpt?.transformBlockList?.length ?? 0;
            tmpTransformBlockList = [
                ...(sTmpPanelOpt.transformBlockList ?? []),
                {
                    id: generateUUID(),
                    alias: `Data${currentLength + 1}`,
                    color: colorList[currentLength],
                    value: '',
                    valid: undefined, // check formula valid
                    isVisible: true,
                    selectedBlockIdxList: [],
                },
            ];
        } else {
            if (sTmpPanelOpt.type === 'Text') {
                if (sTmpPanelOpt?.chartOptions?.chartSeries?.[0] === aIdx + 100) sTmpPanelOpt.chartOptions.chartSeries = [];
                if (sTmpPanelOpt?.chartOptions?.textSeries?.[0] === aIdx + 100) sTmpPanelOpt.chartOptions.textSeries = [];
            }
            const newList = [...sTmpPanelOpt.transformBlockList];
            newList.splice(aIdx, 1);
            tmpTransformBlockList = newList;
        }
        pSetPanelOption({ ...sTmpPanelOpt, transformBlockList: tmpTransformBlockList });
    };
    const getBlockList: BadgeSelectItem[] = useMemo((): BadgeSelectItem[] => {
        return (
            pPanelOption?.blockList?.map((block: any, idx: number) => ({
                label: TRX_REPLACE_LIST[idx],
                name: block.customFullTyping.use
                    ? `custom(${idx})`
                    : getChartSeriesName({
                          alias: block?.useCustom ? block?.values[0]?.alias : block?.alias,
                          table: block?.table,
                          column: block?.useCustom ? block?.values[0]?.value : block?.value,
                          aggregator: block?.useCustom ? block?.values[0]?.aggregator : block?.aggregator,
                      }),
                color: block.color,
                idx: idx,
            })) ?? []
        );
    }, [pPanelOption?.blockList]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(pPanelOption.transformBlockList as TransformBlockType[])?.map((item, index) => {
                return (
                    <TransformBlock
                        key={'transform-block-' + item.id + ''}
                        pVariables={pVariables}
                        pTransformItem={item}
                        pQueryBlockList={getBlockList}
                        handleBlock={() => handleTransformBlock('DELETE', index)}
                        handleItem={(aKey, aValue) => handleTransformBlockItem(aKey, aValue, index)}
                        handleModal={() => setIsModal(true)}
                        pChartType={pPanelOption.type}
                        pBlockCount={pBlockCount}
                    />
                );
            })}
            <TransformAddBlock isDisable={!pBlockCount.addable} callback={() => handleTransformBlock('ADD', pPanelOption?.transformBlockList?.length ?? 0)} />
            {isModal && <TrxHelpModal callback={() => setIsModal(false)} />}
        </div>
    );
};
const TransformBlock = ({
    pTransformItem,
    pVariables,
    pQueryBlockList,
    pChartType,
    pBlockCount,
    handleBlock,
    handleItem,
    handleModal,
}: {
    pTransformItem: TransformBlockType;
    pVariables: any;
    pQueryBlockList: BadgeSelectItem[];
    pChartType: ChartType;
    pBlockCount: any;
    handleBlock: () => void;
    handleItem: (aKey: TransformBlockKeyType, aValue: boolean | string | BadgeSelectItem) => void;
    handleModal: () => void;
}) => {
    const handleFormula = async () => {
        if (pTransformItem?.selectedBlockIdxList.length > 0) {
            let sMapValue = pTransformItem.value;
            const sParsedVasParsedFormula = replaceVariablesInTql(sMapValue, pVariables, {
                interval: { IntervalType: '', IntervalValue: 0 },
                start: '',
                end: '',
            });
            if (sParsedVasParsedFormula.match(VARIABLE_REGEX)) {
                Toast.error('Please check the entered formula.');
                return handleItem('valid', false);
            }
            sMapValue = sParsedVasParsedFormula;
            pVariables;
            pTransformItem.selectedBlockIdxList.map((blockIdx: number, aIdx: number) => {
                if (pQueryBlockList[blockIdx]) sMapValue = sMapValue.replaceAll(new RegExp(`\\b${TRX_REPLACE_LIST[blockIdx]}\\b`, 'g'), `value(${aIdx})`);
            });
            const src = TQL.SRC.FAKE('json', `{[${Array.from({ length: pTransformItem.selectedBlockIdxList.length }).fill(1)}]}`);
            const map = TQL.MAP.MAPVALUE(1, sMapValue);
            const sink = TQL.SINK._JSON();
            const sResult: any = await getTqlChart(`${src}\n${map}\n${sink}`);
            if (!sResult?.data?.success || !sResult?.data?.data?.rows?.length) {
                Toast.error('Please check the entered formula.');
                handleItem('valid', false);
            } else handleItem('valid', true);
        } else handleItem('valid', false);
    };

    return (
        <Page style={{ borderRadius: '4px', border: '1px solid #b8c8da41', gap: '6px', height: 'auto', display: 'table' }}>
            <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                <Page.DpRow style={{ gap: '4px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <DSInput
                        label="Alias"
                        labelPosition="left"
                        type="text"
                        value={pTransformItem.alias}
                        onChange={(e) => handleItem('alias', e.target.value)}
                        size="md"
                        style={{ width: '175px', height: '26px' }}
                    />
                    <Button.Group>
                        <Button size="side" variant="ghost" icon={<RxQuestionMark />} onClick={handleModal} />
                        <Button
                            size="side"
                            variant="ghost"
                            disabled={pBlockCount.addable ? false : pTransformItem?.isVisible ? false : true}
                            icon={pTransformItem?.isVisible ? <VscEye size={16} /> : <VscEyeClosed size={16} />}
                            onClick={() => handleItem('isVisible', !pTransformItem?.isVisible)}
                            data-tooltip-id={pTransformItem.id + '-block-visible'}
                            data-tooltip-content={pTransformItem?.isVisible ? 'Visible' : 'Invisible'}
                        />
                        <ColorPicker
                            color={pTransformItem.color}
                            onChange={(color: string) => handleItem('color', color)}
                            disabled={chartTypeConverter(pChartType) === E_CHART_TYPE.TEXT}
                            tooltipId={pTransformItem.id + '-block-color'}
                            tooltipContent="Color"
                        />
                        <Button size="side" variant="ghost" icon={<Close size={16} />} onClick={handleBlock} />
                    </Button.Group>
                </Page.DpRow>
            </Page.ContentBlock>
            <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                <BadgeSelect
                    label="Series"
                    labelPosition="left"
                    selectedList={pTransformItem.selectedBlockIdxList ?? []}
                    list={pQueryBlockList}
                    onChange={(aItem) => handleItem('selectBlockIdx', aItem)}
                />
            </Page.ContentBlock>
            <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                <Textarea
                    label={
                        <>
                            <span style={{ fontSize: '13px', width: '40px', paddingTop: '8px', display: 'flex', gap: '4px', alignItems: 'start' }}>
                                Formula
                                {pTransformItem.valid !== undefined && !pTransformItem.valid && (
                                    <div style={{ marginTop: '3px' }}>
                                        <BadgeStatus />
                                        <Tooltip
                                            className="tooltip-transform"
                                            positionStrategy="absolute"
                                            anchorSelect={`.tooltip-transform-block`}
                                            content={'Please check the entered formula. (Variables are not supported)'}
                                            delayShow={700}
                                        />
                                    </div>
                                )}
                            </span>
                        </>
                    }
                    labelPosition="left"
                    placeholder=""
                    defaultValue={pTransformItem.value}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => handleItem('value', event.target.value)}
                    onBlur={handleFormula}
                    fullWidth
                    size="sm"
                    resize="vertical"
                    style={{ minHeight: '32px' }}
                />
            </Page.ContentBlock>
        </Page>
    );
};
const TransformAddBlock = ({ isDisable, callback }: { isDisable: boolean; callback: () => void }) => {
    return <Button variant="secondary" fullWidth shadow autoFocus={false} disabled={isDisable} icon={<PlusCircle />} onClick={callback} style={{ height: '60px' }} />;
};
const TrxHelpModal = ({ callback }: { callback: () => void }) => {
    const handleLink = () => {
        window.open('https://docs.machbase.com/neo/tql/utilities/#math', '_blank');
    };
    return (
        <Modal.Root isOpen={true} onClose={callback} size="md">
            <Modal.Header>
                <Modal.Title>Formula</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#b8b8b8' }}>
                        The formula field in Transform supports arithmetic operations and{' '}
                        <a onClick={handleLink} style={{ color: '#4a9eff', cursor: 'pointer', textDecoration: 'underline' }}>
                            mathematical functions
                        </a>
                        .
                    </span>
                    <span style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>examples)</span>
                    <Page.CopyBlock pContent={TRX_FORMULA_EX.EX_1} pHover />
                    <Page.CopyBlock pContent={TRX_FORMULA_EX.EX_2} pHover />
                    <Page.CopyBlock pContent={TRX_FORMULA_EX.EX_3} pHover />
                </Modal.Content>
            </Modal.Body>
        </Modal.Root>
    );
};
