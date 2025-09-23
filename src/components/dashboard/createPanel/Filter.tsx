import { Close, GoPencil, PlusCircle } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { InputSelector } from '@/components/inputs/InputSelector';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';

const Filter = ({ pFilterInfo, pChangeValueOption, pAddFilter, pRemoveFilter, pIdx, pBlockInfo, pColumnList }: any) => {
    const sFliterList = ['=', '<>', '>', '>=', '<', '<=', 'in', 'like'];
    const sIsNameColumn = (pFilterInfo.column ?? '').toUpperCase() === 'NAME';
    const sTableName = pBlockInfo?.table ?? '';
    const sCanUseTagDialog = sIsNameColumn && sTableName !== '' && !sTableName.match(VARIABLE_REGEX) && pBlockInfo?.tableInfo && pBlockInfo.tableInfo.length > 0;
    const sToggleIcon = <GoPencil />;

    return (
        <div className="values filter">
            <div className="series-table">
                <span className="series-title">
                    Filter
                    {pIdx === pBlockInfo.filter.length - 1 ? (
                        <>
                            {pIdx !== 0 && <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />}
                            <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={() => pAddFilter()} />
                        </>
                    ) : (
                        <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />
                    )}
                </span>
            </div>
            {!pFilterInfo.useTyping && (
                <>
                    <div className="series-table">
                        <InputSelector
                            pFontSize={12}
                            pWidth={175}
                            pBorderRadius={4}
                            pHeight={26}
                            pIsDisabled={!pColumnList[0]}
                            pInitValue={pFilterInfo.column}
                            onChange={(aEvent: any) => pChangeValueOption('column', aEvent, pFilterInfo.id, 'filter')}
                            pOptions={pColumnList.map((aItem: any) => {
                                return aItem[0];
                            })}
                        />
                    </div>
                    <div className="series-table operator">
                        <InputSelector
                            pFontSize={12}
                            pWidth={70}
                            pBorderRadius={4}
                            pInitValue={pFilterInfo.operator ?? sFliterList[0]}
                            pHeight={26}
                            onChange={(aEvent: any) => pChangeValueOption('operator', aEvent, pFilterInfo.id, 'filter')}
                            pOptions={sFliterList}
                        />
                    </div>
                </>
            )}
            {pFilterInfo.useTyping ? (
                <div className="series-table">
                    <Input
                        pBorderRadius={4}
                        pWidth={456}
                        pHeight={26}
                        pType="text"
                        pValue={pFilterInfo.typingValue}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => pChangeValueOption('typingValue', aEvent, pFilterInfo.id, 'filter')}
                    />
                </div>
            ) : (
                <div className="series-table">
                    {sCanUseTagDialog ? (
                        <Input
                            pBorderRadius={4}
                            pWidth={175}
                            pHeight={26}
                            pType="text"
                            pValue={pFilterInfo.value}
                            onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pFilterInfo.id, 'filter')}
                        />
                    ) : (
                        <InputSelector
                            pBorderRadius={4}
                            pWidth={175}
                            pHeight={26}
                            pInitValue={pFilterInfo.value}
                            onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pFilterInfo.id, 'filter')}
                            pOptions={[]}
                        />
                    )}
                </div>
            )}
            <div className="series-table padding-4">
                <IconButton
                    pWidth={20}
                    pHeight={20}
                    pIsActive={pFilterInfo.useTyping}
                    pIsToopTip
                    pToolTipContent={pFilterInfo.useTyping ? 'Selecting' : 'Typing'}
                    pToolTipId={pBlockInfo.id + '-block-filter-pencil' + pIdx}
                    pIcon={sToggleIcon}
                    onClick={() => pChangeValueOption('useTyping', { target: { value: !pFilterInfo.useTyping } }, pFilterInfo.id, 'filter')}
                />
            </div>
        </div>
    );
};

export default Filter;
