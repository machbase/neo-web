import { Close, PlusCircle } from '@/assets/icons/Icon';
import { SEPARATE_DIFF } from '@/utils/dashboardUtil';
import { DIFF_LIST } from '@/utils/aggregatorConstants';
import { Page, Button, InputSelect, Input as DSInput } from '@/design-system/components';

const Value = ({ pValue, pColumnList, pChangeValueOption, pAggList, pIdx, pBlockInfo, pPanelOption, pAddValue, pRemoveValue }: any) => {
    return (
        <>
            <Page.Divi direction="horizontal" />
            <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
                    <InputSelect
                        label={
                            <>
                                Value
                                {pPanelOption.type === 'Geomap' ? (
                                    pIdx === pBlockInfo.values.length - 1 ? (
                                        <>
                                            {pIdx !== 0 && <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveValue(pValue.id)} />}
                                            <Button size="icon" variant="ghost" icon={<PlusCircle />} onClick={pAddValue} />
                                        </>
                                    ) : (
                                        <Button size="icon" variant="ghost" icon={<Close />} onClick={() => pRemoveValue(pValue.id)} />
                                    )
                                ) : (
                                    <></>
                                )}
                            </>
                        }
                        labelPosition="left"
                        type="text"
                        options={pColumnList.map((aItem: any) => ({ label: aItem[0], value: aItem[0] }))}
                        value={pValue.value}
                        onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id, 'values')}
                        selectValue={pValue.value}
                        onSelectChange={(value: string) => pChangeValueOption('value', { target: { value } }, pValue.id, 'values')}
                        disabled={!pColumnList[0]}
                        size="md"
                        style={{ width: '160px' }}
                    />

                    <InputSelect
                        label="Aggregator"
                        labelPosition="left"
                        type="text"
                        options={pAggList.map((opt: string) => ({ label: opt, value: opt }))}
                        value={pValue.aggregator ?? 'avg'}
                        onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                        selectValue={pValue.aggregator ?? 'avg'}
                        onSelectChange={(value: string) => pChangeValueOption('aggregator', { target: { value } }, pValue.id, 'values')}
                        disabled={pPanelOption.type === 'Geomap' && pIdx > 0}
                        size="md"
                        style={{ width: '160px' }}
                    />
                    {SEPARATE_DIFF && (
                        <InputSelect
                            label="Diff"
                            labelPosition="left"
                            type="text"
                            options={['none'].concat(DIFF_LIST).map((opt: string) => ({ label: opt, value: opt }))}
                            value={pValue?.diff ?? 'none'}
                            onChange={(aEvent: any) => pChangeValueOption('diff', aEvent, pValue.id, 'values')}
                            selectValue={pValue?.diff ?? 'none'}
                            onSelectChange={(value: string) => pChangeValueOption('diff', { target: { value } }, pValue.id, 'values')}
                            size="md"
                            style={{ width: '160px' }}
                        />
                    )}
                    <DSInput
                        label="Alias"
                        labelPosition="left"
                        type="text"
                        value={pValue.alias}
                        onChange={(aEvent: any) => pChangeValueOption('alias', aEvent, pValue.id, 'values')}
                        size="md"
                        style={{ width: '160px' }}
                    />
                </Page.DpRow>
            </Page.ContentBlock>
        </>
    );
};
export default Value;
