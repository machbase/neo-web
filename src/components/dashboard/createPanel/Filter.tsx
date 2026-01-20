import { Close, GoPencil, PlusCircle } from '@/assets/icons/Icon';
import { Page, Button, InputSelect, Input as DSInput } from '@/design-system/components';

const Filter = ({ pFilterInfo, pChangeValueOption, pAddFilter, pRemoveFilter, pIdx, pBlockInfo, pColumnList }: any) => {
    const sFliterList = ['=', '<>', '>', '>=', '<', '<=', 'in', 'like'];

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
                        options={sFliterList.map((opt: string) => ({ label: opt, value: opt }))}
                        value={pFilterInfo.operator ?? sFliterList[0]}
                        onChange={(aEvent: any) => pChangeValueOption('operator', aEvent, pFilterInfo.id, 'filter')}
                        selectValue={pFilterInfo.operator ?? sFliterList[0]}
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
                    />
                </>
            )}
            <Button
                size="icon"
                variant={pFilterInfo.useTyping ? 'primary' : 'ghost'}
                icon={<GoPencil size={14} />}
                onClick={() => pChangeValueOption('useTyping', { target: { value: !pFilterInfo.useTyping } }, pFilterInfo.id, 'filter')}
                data-tooltip-id={pBlockInfo.id + '-block-filter-pencil' + pIdx}
                data-tooltip-content={pFilterInfo.useTyping ? 'Selecting' : 'Typing'}
            />
        </Page.DpRow>
    );
};

export default Filter;
