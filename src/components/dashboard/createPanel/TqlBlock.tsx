import { Input } from '@/components/inputs/Input';
import { useState } from 'react';
import { SelectFileBtn } from '@/components/buttons/SelectFileBtn';
import { TqlTimeBlock } from './TqlTimeBlock';
import { OpenFileBtn } from '@/components/buttons/OpenFileBtn';
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
                        <span className="tql-block-item-label">Params</span>
                        <Input
                            pBorderRadius={4}
                            pWidth={'500px'}
                            pHeight={26}
                            pType="text"
                            pValue={pPanelOption.tqlInfo?.params ?? ''}
                            pSetValue={() => null}
                            onChange={(aEvent: any) => ChangeOption('params', aEvent)}
                        />
                    </div>
                </div>

                <div className="tql-block-time" style={{ display: sSelectTab === 'time' ? '' : 'none' }}>
                    <TqlTimeBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />
                </div>
            </div>
        </div>
    );
};
