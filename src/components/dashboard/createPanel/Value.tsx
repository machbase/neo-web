import { Close, PlusCircle } from '@/assets/icons/Icon';
import { SEPARATE_DIFF } from '@/utils/dashboardUtil';
import { DIFF_LIST } from '@/utils/aggregatorConstants';
import { Page, Button, InputSelect, Input as DSInput } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { displayJsonPathLabel, isJsonTypeColumn, normalizeJsonPath, parseJsonValueField } from '@/utils/dashboardJsonValue';
import { FIELD_ALIGN_SPACER_STYLE, FIELD_ROW_STYLE, FIELD_STACK_STYLE, FIELD_STYLE, WIDE_FIELD_STYLE } from './layout';

const Value = ({
    pValue,
    pColumnList,
    pChangeValueOption,
    pAggList,
    pIdx,
    pBlockInfo,
    pPanelOption,
    pAddValue,
    pRemoveValue,
    pJsonPathOptions,
    pChangeJsonKeyOption,
}: any) => {
    const sJsonColumnList = pColumnList.filter((aItem: any) => isJsonTypeColumn(aItem[1]));
    const sParsedJsonValue = parseJsonValueField(pValue.value);
    const sValueField = sParsedJsonValue?.column ?? pValue.value;
    const sJsonColumn = sJsonColumnList.some((aItem: any) => aItem[0] === sValueField) ? sValueField : '';
    const sJsonKey = normalizeJsonPath(pValue.jsonKey || sParsedJsonValue?.path || '');
    const [sJsonKeyInputDraft, setJsonKeyInputDraft] = useState<string | undefined>(undefined);

    useEffect(() => {
        setJsonKeyInputDraft(undefined);
    }, [pValue.id, sJsonColumn, sJsonKey]);

    const commitJsonKeyInput = () => {
        if (sJsonKeyInputDraft === undefined) return;
        pChangeJsonKeyOption(sJsonKeyInputDraft, pValue.id);
        setJsonKeyInputDraft(undefined);
    };

    return (
        <div style={FIELD_STACK_STYLE}>
            <Page.DpRow style={FIELD_ROW_STYLE}>
                <div style={FIELD_ALIGN_SPACER_STYLE} />
                <InputSelect
                    label={
                        <>
                            Value field
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
                    labelAlign="right"
                    type="text"
                    options={pColumnList.map((aItem: any) => ({ label: isJsonTypeColumn(aItem[1]) ? `${aItem[0]} (JSON)` : aItem[0], value: aItem[0] }))}
                    value={sValueField}
                    onChange={(aEvent: any) => pChangeValueOption('value', aEvent, pValue.id, 'values')}
                    selectValue={sValueField}
                    onSelectChange={(value: string) => pChangeValueOption('value', { target: { value } }, pValue.id, 'values')}
                    disabled={!pColumnList[0]}
                    size="md"
                    style={sJsonColumn ? FIELD_STYLE : WIDE_FIELD_STYLE}
                />
                {sJsonColumn ? (
                    <InputSelect
                        label="JSON key"
                        labelPosition="left"
                        labelAlign="right"
                        type="text"
                        options={(pJsonPathOptions?.[sJsonColumn] ?? []).map((aPath: string) => ({ label: displayJsonPathLabel(aPath), value: aPath }))}
                        value={sJsonKeyInputDraft ?? displayJsonPathLabel(sJsonKey)}
                        onChange={(aEvent: any) => setJsonKeyInputDraft(aEvent.target.value)}
                        onBlur={commitJsonKeyInput}
                        selectValue={sJsonKey}
                        onSelectChange={(value: string) => {
                            setJsonKeyInputDraft(undefined);
                            pChangeJsonKeyOption(value, pValue.id);
                        }}
                        size="md"
                        style={FIELD_STYLE}
                    />
                ) : null}
            </Page.DpRow>
            <Page.DpRow style={FIELD_ROW_STYLE}>
                <InputSelect
                    label="Aggregator"
                    labelPosition="left"
                    labelAlign="right"
                    type="text"
                    options={pAggList.map((opt: string) => ({ label: opt, value: opt }))}
                    value={pValue.aggregator ?? 'avg'}
                    onChange={(aEvent: any) => pChangeValueOption('aggregator', aEvent, pValue.id, 'values')}
                    selectValue={pValue.aggregator ?? 'avg'}
                    onSelectChange={(value: string) => pChangeValueOption('aggregator', { target: { value } }, pValue.id, 'values')}
                    disabled={pPanelOption.type === 'Geomap' && pIdx > 0}
                    size="md"
                    style={FIELD_STYLE}
                />
                {SEPARATE_DIFF && (
                    <InputSelect
                        label="Diff"
                        labelPosition="left"
                        labelAlign="right"
                        type="text"
                        options={['none'].concat(DIFF_LIST).map((opt: string) => ({ label: opt, value: opt }))}
                        value={pValue?.diff ?? 'none'}
                        onChange={(aEvent: any) => pChangeValueOption('diff', aEvent, pValue.id, 'values')}
                        selectValue={pValue?.diff ?? 'none'}
                        onSelectChange={(value: string) => pChangeValueOption('diff', { target: { value } }, pValue.id, 'values')}
                        size="md"
                        style={FIELD_STYLE}
                    />
                )}
                <DSInput
                    label="Alias"
                    labelPosition="left"
                    labelAlign="right"
                    type="text"
                    value={pValue.alias}
                    onChange={(aEvent: any) => pChangeValueOption('alias', aEvent, pValue.id, 'values')}
                    size="md"
                    style={FIELD_STYLE}
                />
            </Page.DpRow>
        </div>
    );
};
export default Value;
