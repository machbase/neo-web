import { Close, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import CheckBox from '@/components/inputs/CheckBox';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';

const Filter = ({ pFilterInfo, pChangeValueOption, pAddFilter, pRemoveFilter, pIdx, pBlockInfo, pColumnList }: any) => {
    const sFliterList = ['=', '<>', '>', '>=', '<', '<=', 'in', 'like'];
    return (
        <div className="values filter">
            <div className="series-table">
                <span className="series-title">
                    Filter
                    {pIdx === pBlockInfo.filter.length - 1 ? (
                        <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle></PlusCircle>} onClick={() => pAddFilter()}></IconButton>
                    ) : (
                        <IconButton pWidth={25} pHeight={26} pIcon={<Close></Close>} onClick={() => pRemoveFilter(pFilterInfo.id)}></IconButton>
                    )}
                </span>
            </div>
            {!pFilterInfo.useTyping && (
                <>
                    <div className="series-table">
                        {pColumnList[0] && (
                            <Select
                                pFontSize={12}
                                pWidth={175}
                                pBorderRadius={4}
                                pHeight={26}
                                pInitValue={pFilterInfo.column}
                                onChange={(aEvent: any) => pChangeValueOption('column', aEvent, pFilterInfo.id, 'filter')}
                                pOptions={pColumnList.map((aItem: any) => {
                                    return aItem[0];
                                })}
                            />
                        )}
                    </div>
                    <div className="series-table operator">
                        {
                            <Select
                                pFontSize={12}
                                pWidth={70}
                                pBorderRadius={4}
                                pInitValue={pFilterInfo.operator ?? sFliterList[0]}
                                pHeight={26}
                                onChange={(aEvent: any) => pChangeValueOption('operator', aEvent, pFilterInfo.id, 'filter')}
                                pOptions={sFliterList}
                            />
                        }
                    </div>
                </>
            )}
            <div className="series-table">
                <Input
                    pBorderRadius={4}
                    pWidth={pFilterInfo.useTyping ? 436 : 175}
                    pHeight={26}
                    pType="text"
                    pValue={pFilterInfo.value}
                    pSetValue={() => null}
                    onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pFilterInfo.id, 'filter')}
                />
            </div>
            <div className="series-table padding-4">
                <CheckBox
                    onChange={(aEvent: any) => pChangeValueOption('useTyping', aEvent, pFilterInfo.id, 'filter')}
                    pDefaultChecked={pFilterInfo.useTyping}
                    pText={'typing'}
                ></CheckBox>
            </div>
            <div className="series-table padding-4">
                <CheckBox
                    onChange={(aEvent: any) => pChangeValueOption('useFilter', aEvent, pFilterInfo.id, 'filter')}
                    pDefaultChecked={pFilterInfo.useFilter}
                    pText={'use'}
                ></CheckBox>
            </div>
        </div>
    );
};

export default Filter;
