import './index.scss';
import { ExtensionTab } from '../../extension/ExtensionTab';
import SplitPane, { Pane, SashContent } from 'split-pane-react';
import { LuFlipVertical } from 'react-icons/lu';
import { IconButton } from '../../../components/buttons/IconButton';
import { useEffect, useRef, useState } from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';
import { generateUUID } from '../../../utils';
import { useRecoilState } from 'recoil';
import { gBoardList } from '../../../recoil/recoil';
import { postFileList } from '../../../api/repository/api';
import { Close, PlusCircle } from '../../../assets/icons/Icon';
import { DOWNLOADER_EXTENSION, sqlOriginDataDownloader as Downloader } from '../../../utils/sqlOriginDataDownloader';
import Papa from 'papaparse';
import { VARIABLE_RM_REGEX } from '../../../utils/CheckDataCompatibility';

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

    const updateVariableCode = (updateVarList: VARIABLE_TYPE[]) => {
        let sSaveTarget = sBoardList.find((aItem) => aItem.id === pBoardInfo.id);

        if (sSaveTarget?.path !== '') {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        variables: updateVarList,
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                        savedCode: JSON.stringify(sTmpDashboard),
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
            postFileList(sSaveTarget, sSaveTarget?.path, sSaveTarget?.name);
        } else {
            const sTabList = sBoardList.map((aItem) => {
                if (aItem.id === pBoardInfo.id) {
                    const sTmpDashboard = {
                        ...aItem.dashboard,
                        variables: updateVarList,
                    };
                    sSaveTarget = {
                        ...aItem,
                        dashboard: sTmpDashboard,
                    };
                    return sSaveTarget;
                } else return aItem;
            });
            setBoardList(() => sTabList);
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
                    else return { ...sUpdateVariable.data, use: sUpdateVariable.data.valueList[0] };
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
        const tmpVarList = pBoardInfo?.dashboard?.variables?.filter((varInfo: VARIABLE_TYPE) => item.at(-1).id !== varInfo.id);
        updateVariableCode(tmpVarList ?? []);
        setUpdateVariable(DEFAULT_VARIABLE);
    };
    const handleVariableRowSelect = (item: any[]) => {
        setUpdateVariable({
            open: true,
            mode: 'EDIT',
            data: {
                id: item.at(-1).id,
                label: item.at(-1).label,
                type: 'SELECT',
                key: item.at(-1).key,
                use: item.at(-1).use,
                valueList: item.at(-1).valueList,
            },
        });
    };
    const tableFormatVariableList = (): any[][] => {
        const result: any[][] = [];

        pBoardInfo?.dashboard?.variables?.map((varInfo: VARIABLE_TYPE) => {
            const child =
                varInfo.valueList?.length > 0
                    ? varInfo.valueList.map((valueInfo: VARIABLE_ITEM_TYPE) => {
                          return valueInfo.value;
                      })
                    : [];
            result.push([varInfo.label, varInfo.key, child?.join(', '), varInfo]);
        });

        return result;
    };
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
    const createVariableList = (result: unknown[]) => {
        try {
            const checkColumn = result.shift();
            if ((checkColumn as string[]).join(',') !== 'LABEL,VARIABLE NAME,VALUES') return;

            const rowList = result.filter((row: any) => row[0] && row[1] && row[2]);
            const tmpRes: VARIABLE_TYPE[] = rowList.map((row: any) => {
                const useComma = row[2] ? row[2]?.split(',') : [];
                const valList = useComma?.map((value: string) => {
                    return {
                        id: generateUUID(),
                        type: 'CSV',
                        value: value,
                    };
                });
                return { id: generateUUID(), label: row[0], key: row[1], type: 'SELECT', use: valList[0], valueList: valList };
            });
            updateVariableCode(tmpRes ?? []);
        } catch {
            return;
        }
    };
    const handleExport = () => {
        const DEFAULT_COLUMN = 'LABEL,VARIABLE NAME,VALUES\n';
        const tmpExportCSV = pBoardInfo?.dashboard?.variables
            .map((variable: VARIABLE_TYPE) => {
                const valueStringList = variable?.valueList.map((value) => value.value).join(',');
                return `${variable.label},${variable.key},"${valueStringList}"`;
            })
            .join('\n');
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
                        createVariableList(result.data);
                    },
                });
            };
            reader.readAsText(file);
        }
    };
    const handleFileButtonWrapperClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    const handleClose = () => {
        pSetModal(false);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        if (sBodyRef && sBodyRef.current && sBodyRef.current.offsetWidth) {
            setGroupWidth([sBodyRef.current.offsetWidth / 2, sBodyRef.current.offsetWidth / 2]);
        }
    }, [sBodyRef]);

    return (
        <div className="dashboard-variable-wrap">
            <ExtensionTab pRef={sBodyRef}>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    {/* VARIABLES */}
                    <Pane minSize={400}>
                        <ExtensionTab.Header>
                            <IconButton pWidth={20} pHeight={32} pIcon={<IoArrowBackOutline />} onClick={handleClose} />
                        </ExtensionTab.Header>
                        <ExtensionTab.Body>
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.SubTitle>Variables</ExtensionTab.SubTitle>
                                <ExtensionTab.ContentDesc>Variables can make your dashboard more dynamic.</ExtensionTab.ContentDesc>
                            </ExtensionTab.ContentBlock>
                            {/* <ExtensionTab.ContentBlock>
                                <div className="board-preview-variable">
                                    {pBoardInfo?.dashboard?.variables?.map((variable: VARIABLE_TYPE, idx: number) => {
                                        return (
                                            <div className="board-preview-variable-item" key={'board-variable-item-' + idx.toString()}>
                                                <label className="board-preview-variable-item-label">{variable.label}</label>
                                                <div className="board-preview-variable-item-key">{variable.key}</div>
                                                <ExtensionTab.Selector
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
                            </ExtensionTab.ContentBlock> */}
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.DpRowBetween>
                                    <div />
                                    <ExtensionTab.DpRow>
                                        <ExtensionTab.TextButton pText={'Export'} pType="COPY" pCallback={handleExport} pWidth="80px" />
                                        <div className="variable-export-wrapper">
                                            <button className="extension-tab-text-button" onClick={handleFileButtonWrapperClick}>
                                                Import
                                            </button>
                                            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
                                        </div>
                                    </ExtensionTab.DpRow>
                                </ExtensionTab.DpRowBetween>
                                <ExtensionTab.Table
                                    activeRow
                                    pList={{
                                        columns: ['LABEL', 'VARIABLE NAME', 'VALUE'],
                                        rows: tableFormatVariableList(),
                                    }}
                                    rowSelectCallback={handleVariableRowSelect}
                                    rowDeleteCallback={handleVariableDelete}
                                />
                            </ExtensionTab.ContentBlock>
                            {!sUpdateVariable.open && (
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.TextButton pText={'+ New variable'} pType={'CREATE'} pCallback={handleResetUpdateVariable} pWidth="120px" />
                                </ExtensionTab.ContentBlock>
                            )}
                            {sUpdateVariable.open && (
                                <>
                                    {/* <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Type</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Variable type</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Selector
                                            disable
                                            pList={[
                                                { name: 'SELECT', data: 'SELECT' },
                                                { name: 'QUERY', data: 'QUERY' },
                                            ]}
                                            pSelectedItem={sUpdateVariable.data.type}
                                            pCallback={() => {}}
                                        />
                                    </ExtensionTab.ContentBlock> */}

                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Label</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>Label is a descriptive name that helps you identify the variable.</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Input pValue={sUpdateVariable.data.label} pCallback={(item) => handleVarOpt('label', item)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Variable name</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>{`Variables in this system follow a specific syntax format to ensure consistency and ease of use.`}</ExtensionTab.ContentDesc>
                                        <ExtensionTab.ContentDesc>{`The syntax for defining a variable is as follows:`}</ExtensionTab.ContentDesc>
                                        <ExtensionTab.ContentDesc>{`ex) {{VARIABLE_NAME}}`}</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Input pValue={sUpdateVariable.data.key} pCallback={(item) => handleVarOpt('key', item)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.ContentTitle>Value</ExtensionTab.ContentTitle>
                                        <ExtensionTab.ContentDesc>
                                            Each variable can have multiple options. These options can be used interchangeably within the system.
                                        </ExtensionTab.ContentDesc>
                                        <ExtensionTab.ContentDesc>The options are stored in a list and can be accessed or modified as needed.</ExtensionTab.ContentDesc>
                                        {sUpdateVariable.data.valueList.map((valueDetail: VARIABLE_ITEM_TYPE, idx: number) => {
                                            return (
                                                <ExtensionTab.DpRow key={`variable-value-${idx.toString()}`}>
                                                    <ExtensionTab.Input pValue={valueDetail.value} pCallback={(item) => handleVarOpt('value', item, idx)} />
                                                    {sUpdateVariable.data.valueList.length > 1 && (
                                                        <IconButton pWidth={25} pHeight={26} pIcon={<Close />} onClick={() => handleValue('DELETE', idx)} />
                                                    )}
                                                    {sUpdateVariable.data.valueList.length === idx + 1 && (
                                                        <IconButton pWidth={25} pHeight={26} pIcon={<PlusCircle />} onClick={() => handleValue('CREATE', idx)} />
                                                    )}
                                                    <ExtensionTab.ContentBlock />
                                                </ExtensionTab.DpRow>
                                            );
                                        })}
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.TextButton pText={'Cancel'} pType="DELETE" pCallback={handleResetUpdateVariable} pWidth="80px" />
                                            <ExtensionTab.TextButton pText={'Save'} pType="CREATE" pCallback={handleUpdateVarOrigin} pWidth="80px" />
                                        </ExtensionTab.DpRow>
                                    </ExtensionTab.ContentBlock>
                                </>
                            )}
                        </ExtensionTab.Body>
                    </Pane>
                    {/* VALUES */}
                    <Pane>
                        <ExtensionTab.Header>
                            <div />
                            <div style={{ display: 'flex' }}>
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="bridge-tab-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="bridge-tab-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </div>
                        </ExtensionTab.Header>
                    </Pane>
                </SplitPane>
            </ExtensionTab>
        </div>
    );
};
