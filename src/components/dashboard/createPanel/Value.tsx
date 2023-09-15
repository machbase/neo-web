import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';

const Value = ({ pSeriesInfo, pValue, pValueList, pIdx, pAddValue, pRemoveValue, pChangeValueOption }: any) => {
    return (
        <div className="values">
            <div className="series-table">
                <span className="series-title"> Value </span>
                <Select
                    pFontSize={12}
                    pWidth={175}
                    pBorderRadius={4}
                    pInitValue={pValueList[0] && pValueList[0][0]}
                    pHeight={26}
                    onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id)}
                    pOptions={pValueList.map((aItem: any) => {
                        return aItem[0];
                    })}
                />
            </div>
            {pIdx === pSeriesInfo.values.length - 1 ? (
                <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle></PlusCircle>} onClick={() => pAddValue()}></IconButton>
            ) : (
                <IconButton pWidth={25} pHeight={26} pIcon={<Close></Close>} onClick={() => pRemoveValue(pValue.id)}></IconButton>
            )}
            <div className="series-table">
                <span className="series-title"> Alias </span>
                <Input
                    pBorderRadius={4}
                    pWidth={200}
                    pHeight={26}
                    pType="text"
                    pValue={pValue.alias}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => pChangeValueOption('alias', aEvent, pValue.id)}
                />
            </div>
        </div>
    );
};
export default Value;
