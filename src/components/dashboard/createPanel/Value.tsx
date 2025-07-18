import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { InputSelector } from '@/components/inputs/InputSelector';
import { Select } from '@/components/inputs/Select';
import { SEPARATE_DIFF } from '@/utils/dashboardUtil';
import { DIFF_LIST } from '@/utils/aggregatorConstants';

const Value = ({ pValue, pColumnList, pChangeValueOption, pAggList, pIdx, pBlockInfo, pPanelOption, pAddValue, pRemoveValue }: any) => {
    return (
        <div className="values" style={{ flexWrap: 'wrap' }}>
            <div className="series-table">
                <span className="series-title">
                    Value
                    {pPanelOption.type === 'Geomap' ? (
                        pIdx === pBlockInfo.values.length - 1 ? (
                            <>
                                {pIdx !== 0 && <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveValue(pValue.id)} />}
                                <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={pAddValue} />
                            </>
                        ) : (
                            <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveValue(pValue.id)} />
                        )
                    ) : (
                        <></>
                    )}
                </span>
                <InputSelector
                    pFontSize={12}
                    pWidth={175}
                    pBorderRadius={4}
                    pInitValue={pValue.value}
                    pHeight={26}
                    pAutoChanged={false}
                    pIsDisabled={!pColumnList[0]}
                    onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id, 'values')}
                    pOptions={pColumnList.map((aItem: any) => aItem[0])}
                />
            </div>

            <div className="series-table">
                <span className="series-title"> Aggregator </span>
                <InputSelector
                    pFontSize={12}
                    pWidth={175}
                    pBorderRadius={4}
                    pInitValue={pValue.aggregator ?? 'avg'}
                    pHeight={26}
                    pIsDisabled={pPanelOption.type === 'Geomap' && pIdx > 0}
                    onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                    pOptions={pAggList}
                />
            </div>
            {SEPARATE_DIFF && (
                <div className="series-table">
                    <span className="series-title"> Diff </span>
                    <Select
                        pFontSize={12}
                        pAutoChanged={true}
                        pWidth={175}
                        pBorderRadius={4}
                        pInitValue={pValue?.diff ?? 'none'}
                        pHeight={26}
                        onChange={(aEvent: any) => pChangeValueOption('diff', aEvent, pValue.id, 'values')}
                        pOptions={['none'].concat(DIFF_LIST)}
                    />
                </div>
            )}
            <div className="series-table">
                <span className="series-title"> Alias </span>
                <Input
                    pBorderRadius={4}
                    pWidth={175}
                    pHeight={26}
                    pType="text"
                    pValue={pValue.alias}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => pChangeValueOption('alias', aEvent, pValue.id, 'values')}
                />
            </div>
        </div>
    );
};
export default Value;
