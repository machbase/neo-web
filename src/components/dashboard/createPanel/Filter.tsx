import { Close, GoPencil, PlusCircle } from '@/assets/icons/Icon';
import { Page, Button, InputSelect, Input as DSInput } from '@/design-system/components';
import { FILTER_OPERATORS, normalizeFilterOperator } from '@/utils/dashboardFilterOperators';

const Filter = ({ pFilterInfo, pChangeValueOption, pAddFilter, pRemoveFilter, pIdx, pBlockInfo, pColumnList }: any) => {
    const sIsVarchar = pColumnList.find((aItem: any) => aItem[0] === pFilterInfo.column)?.[1] === 5;
    // A board saved before the defaults carried an operator - and a block the column repair never
    // reached - still holds `''` here. `??` let that through as a blank select; the normalizer shows
    // the same operator the query would be built from, and Block writes it back on the next edit.
    const sOperator = normalizeFilterOperator(pFilterInfo.operator);

    return (
        <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
            {pFilterInfo.useTyping ? (
                <div style={{ flex: 1, minWidth: '160px', maxWidth: '456px' }}>
                    <DSInput
                        label={
                            <>
                                Filter
                                {pIdx === pBlockInfo.filter.length - 1 ? (
                                    <>
                                        {pIdx !== 0 && <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />}
                                        <Button size="icon" variant="ghost" icon={<PlusCircle />} onClick={() => pAddFilter()} />
                                    </>
                                ) : (
                                    <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />
                                )}
                            </>
                        }
                        labelPosition="left"
                        labelAlign="right"
                        type="text"
                        value={pFilterInfo.typingValue}
                        onChange={(aEvent: any) => pChangeValueOption('typingValue', aEvent, pFilterInfo.id, 'filter')}
                        size="md"
                        fullWidth
                    />
                </div>
            ) : (
                <>
                    <InputSelect
                        label={
                            <>
                                Filter
                                {pIdx === pBlockInfo.filter.length - 1 ? (
                                    <>
                                        {pIdx !== 0 && <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />}
                                        <Button size="icon" variant="ghost" icon={<PlusCircle />} onClick={() => pAddFilter()} />
                                    </>
                                ) : (
                                    <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveFilter(pFilterInfo.id)} />
                                )}
                            </>
                        }
                        labelPosition="left"
                        labelAlign="right"
                        type="text"
                        options={pColumnList.map((aItem: any) => ({ label: aItem[0], value: aItem[0] }))}
                        value={pFilterInfo.column}
                        onChange={(aEvent: any) => pChangeValueOption('column', aEvent, pFilterInfo.id, 'filter')}
                        selectValue={pFilterInfo.column}
                        onSelectChange={(value: string) => pChangeValueOption('column', { target: { value } }, pFilterInfo.id, 'filter')}
                        disabled={!pColumnList[0]}
                        size="md"
                        style={{ width: '160px' }}
                    />

                    <InputSelect
                        type="text"
                        options={FILTER_OPERATORS.map((opt: string) => ({ label: opt, value: opt }))}
                        value={sOperator}
                        onChange={(aEvent: any) => pChangeValueOption('operator', aEvent, pFilterInfo.id, 'filter')}
                        selectValue={sOperator}
                        onSelectChange={(value: string) => pChangeValueOption('operator', { target: { value } }, pFilterInfo.id, 'filter')}
                        size="md"
                        style={{ width: '128px' }}
                    />

                    <DSInput
                        type="text"
                        value={pFilterInfo.value}
                        onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pFilterInfo.id, 'filter')}
                        size="md"
                        style={{ width: '160px' }}
                        {...((sOperator === 'in' || sIsVarchar) && {
                            addonBefore: <span style={{ color: '#818181' }}>{`${sOperator === 'in' ? '(' : ''}${sIsVarchar ? "'" : ''}`}</span>,
                            addonAfter: <span style={{ color: '#818181' }}>{`${sIsVarchar ? "'" : ''}${sOperator === 'in' ? ')' : ''}`}</span>,
                        })}
                    />
                </>
            )}
            <Button
                size="icon"
                variant={pFilterInfo.useTyping ? 'primary' : 'ghost'}
                icon={<GoPencil size={14} />}
                onClick={() => pChangeValueOption('useTyping', { target: { value: !pFilterInfo.useTyping } }, pFilterInfo.id, 'filter')}
                isToolTip
                toolTipContent={pFilterInfo.useTyping ? 'Selecting' : 'Typing'}
            />
        </Page.DpRow>
    );
};

export default Filter;
