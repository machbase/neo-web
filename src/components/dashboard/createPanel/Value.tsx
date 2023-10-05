import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { tagAggregatorList } from '@/utils/dashboardUtil';

const Value = ({ pSeriesInfo, pValue, pCloumnList, pSelectedTableType, pIdx, pAddValue, pRemoveValue, pChangeValueOption }: any) => {
    return (
        <div className="values">
            <div className="series-table">
                <span className="series-title">
                    Value
                    {pIdx === pSeriesInfo.values.length - 1 ? (
                        <IconButton
                            pDisabled={pSelectedTableType === 'tag'}
                            pWidth={25}
                            pHeight={26}
                            pIcon={<PlusCircle></PlusCircle>}
                            onClick={pSelectedTableType === 'tag' ? () => {} : () => pAddValue()}
                        ></IconButton>
                    ) : (
                        <IconButton pWidth={25} pHeight={26} pIcon={<Close></Close>} onClick={() => pRemoveValue(pValue.id)}></IconButton>
                    )}
                </span>
                {pCloumnList[0] && (
                    <Select
                        pFontSize={12}
                        pWidth={175}
                        pBorderRadius={4}
                        pAutoChanged={true}
                        pInitValue={pCloumnList.filter((aItem: any) => aItem[0] === 'VALUE')[0] ? 'VALUE' : pCloumnList[0] && pCloumnList[0][0]}
                        pHeight={26}
                        onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id, 'values')}
                        pOptions={pCloumnList.map((aItem: any) => aItem[0])}
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
                    pInitValue={tagAggregatorList[0]}
                    pHeight={26}
                    onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                    pOptions={tagAggregatorList}
                />
            </div>
        </div>
    );
};
export default Value;
