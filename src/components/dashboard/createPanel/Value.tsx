// import { Close, PlusCircle } from '@/assets/icons/Icon';
// import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { tagAggregatorList } from '@/utils/dashboardUtil';

const Value = ({
    pValue,
    pColumnList,
    pChangeValueOption,
}: // pBlockInfo,
// pIdx, pAddValue, pRemoveValue,
// ,pValueLimit
any) => {
    return (
        <div className="values">
            <div className="series-table">
                <span className="series-title">
                    Value
                    {/* {pIdx === pBlockInfo.values.length - 1 ? (
                        <IconButton pDisabled={pValueLimit} pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={pValueLimit ? () => {} : () => pAddValue()} />
                    ) : (
                        <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveValue(pValue.id)}></IconButton>
                    )} */}
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
                    pInitValue={pValue.aggregator ?? 'avg'}
                    pHeight={26}
                    onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                    pOptions={tagAggregatorList}
                />
            </div>
        </div>
    );
};
export default Value;
