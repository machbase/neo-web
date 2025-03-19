import { Input } from '@/components/inputs/Input';
import { useState } from 'react';
import { SelectFileBtn } from '@/components/buttons/SelectFileBtn';
import { TqlTimeBlock } from './TqlTimeBlock';
import { OpenFileBtn } from '@/components/buttons/OpenFileBtn';
import { PlusCircle } from '@/assets/icons/Icon';
import { AiFillMinusCircle } from 'react-icons/ai';
import { DropBoxBtn } from '@/components/buttons/DropBoxBtn';
import { SHOW_PARAM_LIST } from '@/utils/DashboardTqlChartParser';
import './TqlBlock.scss';

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
        <div className="tql-block-wrapper">
            <div className="tql-block-tab">
                <div className={sSelectTab === 'tql' ? 'active-tab' : 'inactive-tab'} onClick={() => setSelectTab('tql')}>
                    Tql
                </div>
                <div className={sSelectTab === 'time' ? 'active-tab' : 'inactive-tab'} onClick={() => setSelectTab('time')}>
                    Time
                </div>
            </div>
            <div className="tql-block-body">
                <div style={{ display: sSelectTab === 'tql' ? '' : 'none' }}>
                    <div className="tql-block-item-wrapper">
                        <span className="tql-block-item-label">Tql path</span>
                        <Input
                            pBorderRadius={4}
                            pWidth={'250px'}
                            pHeight={26}
                            pType="text"
                            pValue={pPanelOption.tqlInfo?.path ?? ''}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => ChangeOption('path', aEvent)}
                        />
                        <SelectFileBtn pType="tql" pCallback={handleTql} btnWidth={'100px'} btnHeight="26px" />
                        <OpenFileBtn pType="tql" pFileInfo={pPanelOption.tqlInfo} btnWidth={'100px'} btnHeight="26px" />
                    </div>
                    <div className="tql-block-item-wrapper">
                        <div className="tql-block-item-label">
                            <span className="tql-block-item-label-title">Params</span>
                            <span className="tql-block-item-label-content">{pPanelOption?.tqlInfo.params.length}/12</span>{' '}
                        </div>
                        {paramForm(pPanelOption?.tqlInfo.params ?? [], ChangeOption)}
                    </div>
                </div>

                <div className="tql-block-time" style={{ display: sSelectTab === 'time' ? '' : 'none' }}>
                    <TqlTimeBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />
                </div>
            </div>
        </div>
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
        <div className="tql-block-item-param-wrapper">
            {aParamList &&
                aParamList.map((aParam: any, aIdx: number) => {
                    return (
                        <div className={'tql-block-item-param'} key={'tql-block-item-param-' + aIdx}>
                            <div className="tql-block-item-param">
                                <Input
                                    pBorderRadius={4}
                                    pWidth={'140px'}
                                    pHeight={26}
                                    pType="text"
                                    pValue={aParam.value}
                                    pSetValue={() => null}
                                    onChange={(aEvent: any) => handleChange('value', aEvent, aIdx)}
                                />
                                <div className="tql-block-item-param-equal">=</div>
                                <div className="tql-block-item-param-custom-style">
                                    <Input
                                        pBorderRadius={4}
                                        pWidth={'220px'}
                                        pHeight={26}
                                        pType="text"
                                        pValue={aParam.name}
                                        pSetValue={() => null}
                                        onChange={(aEvent: any) => handleChange('name', aEvent, aIdx)}
                                    />
                                </div>
                                <DropBoxBtn pList={SHOW_PARAM_LIST} pCallback={(aTarget: string) => handleChange('name', { target: { value: aTarget } }, aIdx)} />
                                <div className="tql-block-item-param-icon">
                                    {aParamList.length > 1 && <AiFillMinusCircle onClick={() => delParam(aIdx)} />}
                                    {aIdx === aParamList.length - 1 && aParamList.length !== 12 && <PlusCircle onClick={addParam} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
};
