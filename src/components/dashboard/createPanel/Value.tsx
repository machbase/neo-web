import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { tagAggregatorList } from '@/utils/dashboardUtil';

const Value = ({ pTagTableInfo, pValue, pColumnList, pSelectedTableType, pIdx, pAddValue, pRemoveValue, pChangeValueOption, pValueLimit }: any) => {
    return (
        <div className="values">
            <div className="series-table">
                <span className="series-title">
                    Value
                    {pIdx === pTagTableInfo.values.length - 1 ? (
                        <IconButton
                            pDisabled={pSelectedTableType === 'tag' || pValueLimit === 1}
                            pWidth={25}
                            pHeight={26}
                            pIcon={<PlusCircle></PlusCircle>}
                            onClick={pSelectedTableType === 'tag' || pValueLimit === 1 ? () => {} : () => pAddValue()}
                        ></IconButton>
                    ) : (
                        <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveValue(pValue.id)}></IconButton>
                    )}
                </span>
                {pColumnList[0] && (
                    <Select
                        pFontSize={12}
                        pWidth={175}
                        pBorderRadius={4}
                        pAutoChanged={true}
                        pInitValue={pValue.value && ''}
                        pHeight={26}
                        onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id, 'values')}
                        pOptions={pColumnList.map((aItem: any) => aItem[0])}
                    />
                )}
            </div>

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
            <div className="series-table">
                <span className="series-title"> Aggregator </span>
                <Select
                    pFontSize={12}
                    pWidth={175}
                    pBorderRadius={4}
                    pInitValue={'avg'}
                    pHeight={26}
                    onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                    pOptions={tagAggregatorList}
                />
            </div>
        </div>
    );
};
export default Value;
