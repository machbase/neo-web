import { useState } from 'react';
import { SelectFileBtn } from '@/components/buttons/SelectFileBtn';
import { TimeRangeBlock } from './TimeRangeBlock';
import { OpenFileBtn } from '@/components/buttons/OpenFileBtn';
import { PlusCircle } from '@/assets/icons/Icon';
import { AiFillMinusCircle } from 'react-icons/ai';
import { SHOW_PARAM_LIST } from '@/utils/DashboardTqlChartParser';
import { Button, Input as DSInput, Page, InputSelect } from '@/design-system/components';

export const TqlBlock = ({ pPanelOption, pSetPanelOption }: { pPanelOption: any; pSetPanelOption: any }) => {
    const [sSelectTab, setSelectTab] = useState<string>('tql');

    const ChangeOption = (aOption: string, event: any) => {
        pSetPanelOption((preVal: any) => {
            const tmpVal = JSON.parse(JSON.stringify(preVal.tqlInfo));
            tmpVal[aOption] = event.target.value;
            return { ...preVal, tqlInfo: tmpVal };
        });
    };
    const handleTql = (aKey: string) => {
        ChangeOption('path', { target: { value: aKey } });
    };

    return (
        <>
            <Page.TabContainer>
                <Page.TabList>
                    <Page.TabItem active={sSelectTab === 'tql'} onClick={() => setSelectTab('tql')}>
                        Tql
                    </Page.TabItem>
                    <Page.TabItem active={sSelectTab === 'time'} onClick={() => setSelectTab('time')}>
                        Time
                    </Page.TabItem>
                </Page.TabList>
            </Page.TabContainer>
            <Page.Body style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', border: '1px solid #b8c8da41', gap: '8px' }}>
                {sSelectTab === 'tql' && (
                    <Page.ContentBlock pHoverNone style={{ padding: '0', gap: '4px' }}>
                        <Page.DpRow style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <DSInput
                                label="Tql path"
                                labelPosition="left"
                                type="text"
                                value={pPanelOption.tqlInfo?.path ?? ''}
                                onChange={(aEvent: any) => ChangeOption('path', aEvent)}
                                size="md"
                                style={{ width: '250px' }}
                            />
                            <SelectFileBtn pType="tql" pCallback={handleTql} btnHeight="26px" />
                            <OpenFileBtn pType="tql" pFileInfo={pPanelOption.tqlInfo} btnHeight="26px" />
                        </Page.DpRow>
                        <Page.DpRow style={{ padding: '0', flexDirection: 'column', alignItems: 'start', gap: '4px' }}>
                            <Page.ContentDesc>
                                Params
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#999' }}>{pPanelOption?.tqlInfo.params.length}/12</span>
                            </Page.ContentDesc>
                            {paramForm(pPanelOption?.tqlInfo.params ?? [], ChangeOption)}
                        </Page.DpRow>
                    </Page.ContentBlock>
                )}
                {sSelectTab === 'time' && <TimeRangeBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} pEnableLastToNowConversion={true} pUseTqlTimeRange={true} />}
            </Page.Body>
        </>
    );
};

const paramForm = (aParamList: any, aChange: (key: string, value: any) => void) => {
    const INIT_DATA = { name: '', value: '', format: '' };

    const handleChange = (aKey: string, event: any, aIdx: number) => {
        const sTmpParamList = JSON.parse(JSON.stringify(aParamList));
        sTmpParamList.splice(aIdx, 1, { ...sTmpParamList[aIdx], [aKey]: event.target.value });
        aChange('params', { target: { value: sTmpParamList } });
    };
    const addParam = () => {
        if (aParamList.length === 12) return;
        const sTmpParamList = JSON.parse(JSON.stringify(aParamList));
        sTmpParamList.push(INIT_DATA);
        aChange('params', { target: { value: sTmpParamList } });
    };
    const delParam = (aIdx: number) => {
        const sTmpParamList = JSON.parse(JSON.stringify(aParamList));
        sTmpParamList.splice(aIdx, 1);
        aChange('params', { target: { value: sTmpParamList } });
    };

    return (
        <>
            {aParamList &&
                aParamList.map((aParam: any, aIdx: number) => {
                    return (
                        <Page.DpRow key={'tql-block-item-param-' + aIdx} style={{ gap: '8px' }}>
                            <DSInput
                                type="text"
                                value={aParam.value}
                                onChange={(aEvent: any) => handleChange('value', aEvent, aIdx)}
                                size="md"
                                style={{ width: '140px', height: '30px' }}
                            />
                            <Page.ContentDesc>=</Page.ContentDesc>
                            <InputSelect
                                type="text"
                                value={aParam.name}
                                onChange={(aEvent: any) => handleChange('name', aEvent, aIdx)}
                                options={SHOW_PARAM_LIST.map((item) => ({ label: item, value: item }))}
                                selectValue={aParam.name}
                                onSelectChange={(value: string) => handleChange('name', { target: { value } }, aIdx)}
                                size="md"
                                style={{ width: '220px', height: '30px' }}
                            />
                            {aParamList.length > 1 ? <Button size="sm" variant="secondary" icon={<AiFillMinusCircle size={16} />} onClick={() => delParam(aIdx)} /> : null}
                            {aIdx === aParamList.length - 1
                                ? aParamList.length !== 12 && <Button size="sm" variant="secondary" icon={<PlusCircle size={16} />} onClick={addParam} />
                                : null}
                        </Page.DpRow>
                    );
                })}
        </>
    );
};
