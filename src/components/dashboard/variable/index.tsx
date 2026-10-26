import { Button, Page, CommonTable, Modal, Toast } from '@/design-system/components';
import { SplitPane, Pane } from '@/design-system/components';
import { LuFlipVertical } from 'react-icons/lu';
import { useEffect, useRef, useState } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { generateUUID } from '@/utils';
import { useRecoilState } from 'recoil';
import { gBoardList, type GBoardListType } from '@/recoil/recoil';
import { postFileList } from '@/api/repository/api';
import { Close, PlusCircle } from '@/assets/icons/Icon';
import { DOWNLOADER_EXTENSION, sqlOriginDataDownloader as Downloader } from '@/utils/sqlOriginDataDownloader';
import Papa from 'papaparse';
import { VARIABLE_RM_REGEX } from '@/utils/CheckDataCompatibility';
import { mergeVariables, parseVariableCsv, VARIABLE_CSV_HEADER, variableCsvRow } from './variableCsv';

export enum VARIABLE_DEFAULT_TYPE {
    DEFAULT_DEFINED = 'DEFAULT_DEFINED',
}
const defaultVariableList: string[] = ['from_str', 'from_s', 'from_ms', 'from_us', 'from_ns', 'to_str', 'to_s', 'to_ms', 'to_us', 'to_ns', 'period', 'period_unit', 'period_value'];
export const DEFAULT_VARIABLE_LIST: VARIABLE_TYPE[] = defaultVariableList.map((defaultVariable) => {
    return {
        id: `default_variable-${defaultVariable}`,
        label: defaultVariable,
        key: `{{${defaultVariable}}}`,
        type: 'SELECT',
        use: {
            id: `default_variable-${defaultVariable}-value`,
            type: VARIABLE_DEFAULT_TYPE.DEFAULT_DEFINED,
            value: '',
        },
        valueList: [
            {
                id: `default_variable-${defaultVariable}-value`,
                type: VARIABLE_DEFAULT_TYPE.DEFAULT_DEFINED,
                value: '',
            },
        ],
    };
});

export interface VARIABLE_TYPE {
    id: string;
    label: string;
    key: string;
    type: 'SELECT' | 'QUERY';
    use: VARIABLE_ITEM_TYPE;
    valueList: VARIABLE_ITEM_TYPE[];
}
export interface VARIABLE_ITEM_TYPE {
    id: string;
    type: string;
    value: string;
}
type MODE_TYPE = 'CREATE' | 'EDIT';

const DEFAULT_VARIABLE = {
    open: false,
    mode: 'CREATE' as MODE_TYPE,
    data: {
        id: '',
        label: '',
        key: '',
        type: 'SELECT',
        use: {
            id: '',
            type: 'CSV',
            value: '',
        },
        valueList: [
            {
                id: '',
                type: 'CSV',
                value: '',
            },
        ],
    } as VARIABLE_TYPE,
};

export const Variable = ({ pBoardInfo, pSetModal }: { pBoardInfo: any; pSetModal: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sBodyRef: any = useRef(null);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sUpdateVariable, setUpdateVariable] = useState<{ open: boolean; mode: MODE_TYPE; data: VARIABLE_TYPE }>(DEFAULT_VARIABLE);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sImportPending, setImportPending] = useState<{ variables: VARIABLE_TYPE[]; skipped: string[] } | null>(null);

    const updateVariableCode = (updateVarList: VARIABLE_TYPE[]) => {
        const sCurrentBoard = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);

        if (!sCurrentBoard) {
            return;
        }

        const sTabList = sBoardList.map((aItem): GBoardListType => {
            if (aItem.id !== pBoardInfo.id) {
                return aItem;
            }

            const sTmpDashboard = {
                ...aItem.dashboard,
                variables: updateVarList,
            };

            return {
                ...aItem,
                dashboard: sTmpDashboard,
                savedCode: sCurrentBoard.path !== '' ? JSON.stringify(sTmpDashboard) : aItem.savedCode,
            };
        });

        setBoardList(() => sTabList);

        if (sCurrentBoard.path !== '') {
            const sSaveTarget = sTabList.find((aItem) => aItem.id === pBoardInfo.id);
            if (sSaveTarget) {
                postFileList(sSaveTarget, sSaveTarget.path, sSaveTarget.name);
            }
        }
    };
    const variableNmValidator = (value: string) => {
        const sResult = value.replace(VARIABLE_RM_REGEX, '');
        return `{{${sResult}}}`;
    };
    const handleUpdateVarOrigin = () => {
        let tmpVarList;
        if (sUpdateVariable.mode === 'EDIT') {
            tmpVarList = pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
                if (sUpdateVariable.data.id === varInfo.id) {
                    const tmpValue = sUpdateVariable.data.valueList?.filter((value) => value.id === sUpdateVariable.data.use.id);
                    if (tmpValue?.length > 0) return { ...sUpdateVariable.data, key: variableNmValidator(sUpdateVariable.data.key), use: tmpValue[0] };
                    // The selected value was removed in this edit: fall back to the first one, still saving a wrapped name.
                    else return { ...sUpdateVariable.data, key: variableNmValidator(sUpdateVariable.data.key), use: sUpdateVariable.data.valueList[0] };
                } else return varInfo;
            });
        }
        if (sUpdateVariable.mode === 'CREATE') {
            tmpVarList = pBoardInfo?.dashboard?.variables?.concat({
                ...sUpdateVariable.data,
                key: variableNmValidator(sUpdateVariable.data.key),
                use: sUpdateVariable.data.valueList[0],
                id: generateUUID(),
            });
        }
        updateVariableCode(tmpVarList ?? []);
        handleResetUpdateVariable();
    };
    const handleResetUpdateVariable = () => {
        setUpdateVariable((prev) => {
            return {
                ...DEFAULT_VARIABLE,
                data: {
                    ...DEFAULT_VARIABLE.data,
                    valueList: [
                        {
                            id: generateUUID(),
                            type: 'CSV',
                            value: '',
                        },
                    ],
                },
                open: !prev.open,
            };
        });
    };
    const handleVariableDelete = (item: any[]) => {
        const sVariable = findRowVariable(item);
        if (!sVariable) return;
        const tmpVarList = pBoardInfo?.dashboard?.variables?.filter((varInfo: VARIABLE_TYPE) => sVariable.id !== varInfo.id);
        updateVariableCode(tmpVarList ?? []);
        setUpdateVariable(DEFAULT_VARIABLE);
    };
    const handleVariableRowSelect = (item: any[]) => {
        const sVariable = findRowVariable(item);
        if (!sVariable) return;
        setUpdateVariable({
            open: true,
            mode: 'EDIT',
            data: {
                id: sVariable.id,
                label: sVariable.label,
                type: 'SELECT',
                key: sVariable.key,
                use: sVariable.use,
                valueList: sVariable.valueList,
            },
        });
    };
    // Rows hold only the shown cells; the variable behind each row is looked up by the row itself.
    const sVariableRows: { row: string[]; variable: VARIABLE_TYPE }[] = (pBoardInfo?.dashboard?.variables ?? []).map((varInfo: VARIABLE_TYPE) => {
        const child = varInfo.valueList?.length > 0 ? varInfo.valueList.map((valueInfo: VARIABLE_ITEM_TYPE) => valueInfo.value) : [];
        return { row: [varInfo.label, varInfo.key, child.join(', ')], variable: varInfo };
    });
    const findRowVariable = (aRow: any[]): VARIABLE_TYPE | undefined => sVariableRows.find((aItem) => aItem.row === aRow)?.variable;
    // const handleValueUse = (variable: VARIABLE_TYPE, item: VARIABLE_ITEM_TYPE) => {
    //     const tmpVarList = pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
    //         if (variable.id === varInfo.id) {
    //             varInfo;
    //             return { ...varInfo, use: item };
    //         } else return varInfo;
    //     });
    //     updateVariableCode(tmpVarList ?? []);
    // };

    const handleVarOpt = (key: string, item: React.FormEvent<HTMLInputElement>, idx?: number) => {
        if (key === 'value') {
            setUpdateVariable((prev) => {
                const tmp = JSON.parse(JSON.stringify(prev.data.valueList));
                tmp.splice(idx, 1, { ...tmp[idx as number], value: (item.target as HTMLInputElement).value });
                return { ...prev, data: { ...prev.data, valueList: tmp } };
            });
        } else {
            setUpdateVariable((prev) => {
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        [key]: (item.target as HTMLInputElement).value,
                    },
                };
            });
        }
    };
    const handleValue = (key: 'DELETE' | 'CREATE', idx: number) => {
        // CREATE
        if (key === 'CREATE')
            setUpdateVariable((prev) => {
                return {
                    ...prev,
                    data: {
                        ...prev.data,
                        valueList: prev.data.valueList.concat({
                            id: generateUUID(),
                            type: 'CSV',
                            value: '',
                        }),
                    },
                };
            });
        // DELETE
        if (key === 'DELETE')
            setUpdateVariable((prev) => {
                const tmp = JSON.parse(JSON.stringify(prev.data.valueList));
                tmp.splice(idx, 1);
                return { ...prev, data: { ...prev.data, valueList: tmp } };
            });
    };
    // Import asks before it touches the board (#1566): it used to replace every variable and save the
    // file on the spot. The choice only changes the open board; the file is written by the board's Save.
    const createVariableList = (result: unknown[][]) => {
        const { headerError, variables, skipped } = parseVariableCsv(result);
        if (headerError) {
            Toast.error(`Cannot import: ${headerError}`, { testId: 'variable-import-toast' });
            return;
        }
        if (variables.length === 0) {
            Toast.error(`Nothing to import: ${skipped.length ? `${skipped.join(', ')} left out (empty label, name or values).` : 'the file has no variables.'}`, {
                testId: 'variable-import-toast',
            });
            return;
        }
        setImportPending({ variables, skipped });
    };
    const applyImport = (aMode: 'REPLACE' | 'MERGE') => {
        if (!sImportPending) return;
        const sCurrent: VARIABLE_TYPE[] = pBoardInfo?.dashboard?.variables ?? [];
        const sNextList = aMode === 'REPLACE' ? sImportPending.variables : mergeVariables(sCurrent, sImportPending.variables);
        setBoardList((aPrev) =>
            aPrev.map((aItem): GBoardListType => (aItem.id === pBoardInfo.id ? { ...aItem, dashboard: { ...aItem.dashboard, variables: sNextList } } : aItem))
        );
        setImportPending(null);
        Toast.success(`Imported ${sImportPending.variables.length} variable(s). Save the board to keep them.`, { testId: 'variable-import-toast' });
    };
    const handleExport = () => {
        const DEFAULT_COLUMN = `${VARIABLE_CSV_HEADER.join(',')}\n`;
        const tmpExportCSV = pBoardInfo?.dashboard?.variables.map(variableCsvRow).join('\n');
        const sBlob = new Blob([DEFAULT_COLUMN + tmpExportCSV], { type: `text/csv` });
        Downloader(URL.createObjectURL(sBlob), DOWNLOADER_EXTENSION.CSV);
    };
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                Papa.parse(text, {
                    header: false,
                    complete: (result) => {
                        createVariableList(result.data as unknown[][]);
                    },
                });
            };
            reader.readAsText(file);
        }
        // Picking the same file again (after Cancel) has to start another import.
        event.target.value = '';
    };
    const handleFileButtonWrapperClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    const handleClose = () => {
        pSetModal(false);
    };

    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);
    return (
        <Page pRef={sBodyRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999 }} data-testid="dashboard-variable-editor">
            <SplitPane split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                {/* VARIABLES */}
                <Pane minSize={400}>
                    <Page.Header>
                        <Button size="icon" variant="ghost" icon={<IoArrowBackOutline size={16} />} onClick={handleClose} data-testid="back" />
                    </Page.Header>
                    <Page.Body>
                        <Page.ContentBlock>
                            <Page.SubTitle>Variables</Page.SubTitle>
                            <Page.ContentDesc>Variables can make your dashboard more dynamic.</Page.ContentDesc>
                        </Page.ContentBlock>
                        {/* <Page.ContentBlock>
                                <div className="board-preview-variable">
                                    {pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                                        return (
                                            <div className="board-preview-variable-item" key={'board-variable-item-' + idx.toString()}>
                                                <label className="board-preview-variable-item-label">{variable.label}</label>
                                                <div className="board-preview-variable-item-key">{variable.key}</div>
                                                <Page.Selector
                                                    pList={variable.valueList.map((value) => {
                                                        return { name: value.value, data: value };
                                                    })}
                                                    pSelectedItem={variable.use.value}
                                                    pCallback={(item: VARIABLE_ITEM_TYPE) => handleValueUse(variable, item)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </Page.ContentBlock> */}
                        <Page.ContentBlock>
                            <Page.DpRowBetween>
                                <div />
                                <Page.DpRow>
                                    <Page.TextButton pText={'Export'} pType="COPY" pCallback={handleExport} pWidth="80px" data-testid="export" />
                                    <div className="variable-export-wrapper">
                                        <Page.TextButton pText={'Import'} pType="COPY" pCallback={handleFileButtonWrapperClick} pWidth="80px" data-testid="import" />
                                        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} data-testid="import-input" />
                                    </div>
                                </Page.DpRow>
                            </Page.DpRowBetween>
                            <CommonTable
                                activeRow
                                data={{
                                    columns: ['LABEL', 'VARIABLE NAME', 'VALUE'],
                                    rows: sVariableRows.map((aItem) => aItem.row),
                                }}
                                onRowSelect={handleVariableRowSelect}
                                getRowTestId={(aRow) => `variable-${encodeURIComponent(findRowVariable(aRow)?.id ?? '')}`}
                                onRowDelete={handleVariableDelete}
                            />
                        </Page.ContentBlock>
                        {!sUpdateVariable.open && (
                            <Page.ContentBlock>
                                <Page.TextButton pText={'+ New variable'} pType={'CREATE'} pCallback={handleResetUpdateVariable} pWidth="120px" data-testid="new-variable" />
                            </Page.ContentBlock>
                        )}
                        {sUpdateVariable.open && (
                            <>
                                {/* <Page.ContentBlock>
                                        <Page.ContentTitle>Type</Page.ContentTitle>
                                        <Page.ContentDesc>Variable type</Page.ContentDesc>
                                        <Page.Selector
                                            disable
                                            pList={[
                                                { name: 'SELECT', data: 'SELECT' },
                                                { name: 'QUERY', data: 'QUERY' },
                                            ]}
                                            pSelectedItem={sUpdateVariable.data.type}
                                            pCallback={() => {}}
                                        />
                                    </Page.ContentBlock> */}

                                <Page.ContentBlock>
                                    <Page.ContentTitle>Label</Page.ContentTitle>
                                    <Page.ContentDesc>Label is a descriptive name that helps you identify the variable.</Page.ContentDesc>
                                    <Page.Input pValue={sUpdateVariable.data.label} pCallback={(item) => handleVarOpt('label', item)} data-testid="label-input" />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Variable name</Page.ContentTitle>
                                    <Page.ContentDesc>{`Variables in this system follow a specific syntax format to ensure consistency and ease of use.`}</Page.ContentDesc>
                                    <Page.ContentDesc>{`The syntax for defining a variable is as follows:`}</Page.ContentDesc>
                                    <Page.ContentDesc>{`ex) {{VARIABLE_NAME}}`}</Page.ContentDesc>
                                    <Page.Input pValue={sUpdateVariable.data.key} pCallback={(item) => handleVarOpt('key', item)} data-testid="name-input" />
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.ContentTitle>Value</Page.ContentTitle>
                                    <Page.ContentDesc>Each variable can have multiple options. These options can be used interchangeably within the system.</Page.ContentDesc>
                                    <Page.ContentDesc>The options are stored in a list and can be accessed or modified as needed.</Page.ContentDesc>
                                    {sUpdateVariable.data.valueList.map((valueDetail: VARIABLE_ITEM_TYPE, idx: number) => {
                                        return (
                                            <Page.DpRow key={`variable-value-${idx.toString()}`} style={{ gap: '4px' }} data-testid={`value-${encodeURIComponent(valueDetail.id)}`}>
                                                <Page.Input pValue={valueDetail.value} pCallback={(item) => handleVarOpt('value', item, idx)} data-testid="value-input" />
                                                {sUpdateVariable.data.valueList.length > 1 ? (
                                                    <Button size="sm" variant="ghost" icon={<Close size={16} />} onClick={() => handleValue('DELETE', idx)} data-testid="delete-value" />
                                                ) : null}
                                                {sUpdateVariable.data.valueList.length === idx + 1 ? (
                                                    <Button size="sm" variant="ghost" icon={<PlusCircle size={16} />} onClick={() => handleValue('CREATE', idx)} data-testid="add-value" />
                                                ) : null}
                                            </Page.DpRow>
                                        );
                                    })}
                                </Page.ContentBlock>
                                <Page.ContentBlock>
                                    <Page.DpRow>
                                        <Page.TextButton pText={'Cancel'} pType="DELETE" pCallback={handleResetUpdateVariable} pWidth="80px" data-testid="cancel" />
                                        <Page.TextButton pText={'Save'} pType="CREATE" pCallback={handleUpdateVarOrigin} pWidth="80px" data-testid="save" />
                                    </Page.DpRow>
                                </Page.ContentBlock>
                            </>
                        )}
                    </Page.Body>
                </Pane>
                {/* VALUES */}
                <Pane>
                    <Page.Header>
                        <div />
                        <Button.Group>
                            <Button
                                size="sm"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Vertical"
                                icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                active={isVertical}
                                onClick={() => setIsVertical(true)}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                isToolTip
                                toolTipContent="Horizontal"
                                icon={<LuFlipVertical size={16} />}
                                active={!isVertical}
                                onClick={() => setIsVertical(false)}
                            />
                        </Button.Group>
                    </Page.Header>
                </Pane>
            </SplitPane>
            {sImportPending && (
                <Modal.Root isOpen onClose={() => setImportPending(null)} data-testid="variable-import-dialog">
                    <Modal.Header>
                        <Modal.Title>Import variables</Modal.Title>
                        <Modal.Close data-testid="close" />
                    </Modal.Header>
                    <Modal.Body>
                        <div>{`The file has ${sImportPending.variables.length} variable(s):`}</div>
                        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                            {sImportPending.variables.map((aVariable) => (
                                <li key={aVariable.id}>{`${aVariable.label} ${aVariable.key}: ${aVariable.valueList.map((aValue) => JSON.stringify(aValue.value)).join(', ')}`}</li>
                            ))}
                        </ul>
                        {sImportPending.skipped.length > 0 && <div data-testid="skipped">{`Left out (empty label, name or values): ${sImportPending.skipped.join(', ')}`}</div>}
                        <div>{`Replace the board's ${pBoardInfo?.dashboard?.variables?.length ?? 0} variable(s), or merge (a variable with the same name is replaced)?`}</div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Modal.Confirm data-testid="replace" onClick={() => applyImport('REPLACE')}>
                            Replace
                        </Modal.Confirm>
                        <Modal.Confirm data-testid="merge" onClick={() => applyImport('MERGE')}>
                            Merge
                        </Modal.Confirm>
                        <Modal.Cancel data-testid="cancel" autoFocus onClick={() => setImportPending(null)}>
                            Cancel
                        </Modal.Cancel>
                    </Modal.Footer>
                </Modal.Root>
            )}
        </Page>
    );
};
