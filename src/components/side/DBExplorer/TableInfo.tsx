import { getTableInfo, getColumnIndexInfo, getRollupTable } from '@/api/repository/api';
import { useState } from 'react';
import { GoDotFill, FaDatabase, TfiLayoutColumn3Alt, VscChevronRight } from '@/assets/icons/Icon';
import './TableInfo.scss';
import { getUserName } from '@/utils';

const TableInfo = ({ pShowHiddenObj, pValue }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const DBDiv = (aIcon: React.ReactElement, aName: string, aClassName: string): JSX.Element => {
        return (
            <div className="db-folder-wrap">
                <VscChevronRight className={`${aClassName}`} />
                <span className="icons" style={{ color: '#f1c16b' }}>
                    {aIcon}
                </span>
                <span className="db-folder-wrap-name">{aName}</span>
            </div>
        );
    };
    return (
        <>
            {/* DB */}
            {pValue && pValue.dbName && (
                <div className="db-wrap db-exp-comm" style={{ alignItems: 'baseline' }} onClick={() => setCollapseTree(!sCollapseTree)}>
                    {DBDiv(<FaDatabase />, pValue.dbName, sCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow')}
                </div>
            )}
            {/* USER */}
            {pValue && sCollapseTree && (
                <div className="user-wrap db-exp-comm">
                    {pValue.userList.map((aUser: { userName: string; total: number; tableList: any }) => {
                        return <UserDiv key={aUser.userName + '-user'} pShowUserIcon={pValue.userList.length > 1} pUserData={aUser} pShowHiddenObj={pShowHiddenObj} />;
                    })}
                </div>
            )}
        </>
    );
};

interface UserDivPropsType {
    pUserData: { userName: string; total: number; tableList: any };
    pShowHiddenObj: boolean;
    pShowUserIcon: boolean;
}
const UserDiv = (props: UserDivPropsType): JSX.Element => {
    const [sCollapseTree, setCollapseTree] = useState(true);
    const TableTypeList: string[] = ['tag', 'log', 'fixed', 'volatile', 'lookup', 'keyValue'];
    const sUserName = getUserName().toUpperCase();
    const getTableInfoData = async (aDatabaseId: string, aTableId: string) => {
        return await getTableInfo(aDatabaseId, aTableId);
    };
    const getColumnIndexInfoData = async (aDatabaseId: string, aTableId: string) => {
        return await getColumnIndexInfo(aDatabaseId, aTableId);
    };
    const checkDisplay = (aValue: number): boolean => {
        if (aValue === 0) return true;
        if (!props.pShowHiddenObj) return true;
        return false;
    };
    const UserColumn = (aIcon: React.ReactElement, aName: string, aClassName: string): JSX.Element => {
        return (
            <div className="user-folder-wrap">
                <VscChevronRight className={`${aClassName}`} />
                <span className="icons" style={{ color: '#c4c4c4' }}>
                    {aIcon}
                </span>
                <span className="user-folder-wrap-name">{aName}</span>
            </div>
        );
    };
    return (
        <>
            {props.pUserData && props.pShowUserIcon && (
                <div className="user-column " style={{ alignItems: 'baseline' }} onClick={() => setCollapseTree(!sCollapseTree)}>
                    {UserColumn(<FaUser />, props.pUserData.userName, sCollapseTree ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow')}
                </div>
            )}
            {props.pUserData && props.pUserData.tableList && sCollapseTree && (
                <div className="table-wrap db-exp-comm">
                    {TableTypeList.map((aTableType: string, aIdx: number) => {
                        return (
                            <div key={`table-${aTableType}-${aIdx}`}>
                                {props.pUserData.tableList[aTableType].map((aTable: any, bIdx: number) => {
                                    return (
                                        checkDisplay(aTable[5]) && (
                                            <div className="table-wrap-content" key={`table-${aTableType}-${aIdx}-${bIdx}`}>
                                                <TableDiv
                                                    pShowHiddenObj={props.pShowHiddenObj}
                                                    pUserName={sUserName}
                                                    pTableIcon={<TfiLayoutColumn3Alt style={{ color: '#5ca3dc', rotate: '90deg' }} />}
                                                    pTable={aTable}
                                                    pTableType={aTableType}
                                                    onTableInfo={getTableInfoData}
                                                    onColumnInfo={getColumnIndexInfoData}
                                                />
                                            </div>
                                        )
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

interface TableDivPropsType {
    pShowHiddenObj: boolean;
    pTableIcon: React.ReactElement;
    pTableType: string;
    pUserName: string;
    pTable: (string | number)[];
    onTableInfo: (aDatabaseId: string, aTableId: string) => any;
    onColumnInfo: (aDatabaseId: string, atableId: string) => any;
}
const TableDiv = (props: TableDivPropsType): JSX.Element => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<(string | number)[][]>([]);
    const [sIndexList, setIndexList] = useState<(string | number)[][]>([]);
    const [sRollupList, setRollupList] = useState<(string | number)[][]>([]);

    const handleDataFetch = async () => {
        if (sIsOpen) return setIsOpen(false);
        else setIsOpen(true);
        handleColumns();
        fetchIndex();
        if ((props.pTable[4] as number) === 6 && props.pTable[0] === 'MACHBASEDB') fetchRollup();
    };
    const handleColumns = async () => {
        const res = await props.onTableInfo(props.pTable[6].toString(), props.pTable[2].toString());
        setColumnList(res.data.rows);
    };
    const fetchIndex = async () => {
        const res = await props.onColumnInfo(props.pTable[6].toString(), props.pTable[2].toString());
        setIndexList(res.data.rows);
    };
    const fetchRollup = async () => {
        const res = await getRollupTable(`${props.pTable[3].toString()}`, props.pTable[1].toString());
        setRollupList(res.data.rows);
    };
    return (
        <>
            <div className="table-column-wrap" onClick={handleDataFetch}>
                <div className="table-column-l">
                    <VscChevronRight className={`${sIsOpen ? 'db-exp-arrow db-exp-arrow-bottom' : 'db-exp-arrow'}`} />
                    <span className="icons">{props.pTableIcon}</span>
                    <span className="table-name">
                        {(props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === 'SYS') || (props.pTable[0] === 'MACHBASEDB' && props.pTable[1] === props.pUserName)
                            ? props.pTable[3]
                            : `${props.pTable[1]}.${props.pTable[3]}`}
                    </span>
                </div>
                <span className="r-txt">{props.pTableType}</span>
            </div>
            {sIsOpen && sColumnList.length > 0 && (
                <ColumnDiv pKey={props.pTable[0] as string} pShowHiddenObj={props.pShowHiddenObj} pColumnList={sColumnList} pIndexList={sIndexList} pRollupList={sRollupList} />
            )}
        </>
    );
};
interface ColumnDivPropsType {
    pKey: string;
    pShowHiddenObj: boolean;
    pColumnList: (string | number)[][];
    pIndexList: (string | number)[][];
    pRollupList: (string | number)[][];
}
const ColumnDiv = (props: ColumnDivPropsType): JSX.Element => {
    const columnNameList: string[] = ['columns', 'index', 'rollup'];
    const getIndexType = (aType: number): string => {
        switch (aType) {
            case 1:
                return 'BITMAP';
            case 2:
                return 'KEYWORD';
            case 3:
                return 'REDBLACK';
            case 6:
                return 'LSM';
            case 8:
                return 'REDBLACK';
            case 9:
                return 'KETWORD_LSM';
            case 11:
                return 'TAG';
            default:
                return '';
        }
    };
    const getColumnType = (columnId: number) => {
        switch (columnId) {
            case 104:
                return 'ushort';
            case 8:
                return 'integer';
            case 108:
                return 'uinteger';
            case 12:
                return 'long';
            case 112:
                return 'ulong';
            case 16:
                return 'float';
            case 20:
                return 'double';
            case 5:
                return 'varchar';
            case 49:
                return 'text';
            case 53:
                return 'clob';
            case 57:
                return 'blob';
            case 97:
                return 'binary';
            case 6:
                return 'datetime';
            case 32:
                return 'ipv4';
            case 36:
                return 'ipv6';
            case 61:
                return 'json';
            default:
                return 'unknown ' + `(${columnId})`;
        }
    };
    const checkDisplay = (aColumn: string, aData?: (string | number)[]): boolean => {
        if (!props.pShowHiddenObj) return true;
        switch (aColumn) {
            case 'column': {
                if (!aData) return false;
                if (aData[3].toString() === '65534') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ARRIVAL_TIME') return false;
                if (aData[3].toString() === '0' && aData[0].toString() === '_ROWID') return false;
                return true;
            }
            case 'index':
                return false;
            case 'rollup':
                return false;
            default:
                return true;
        }
    };
    return (
        <>
            {columnNameList.map((aColumn: string, aIdx: number) => {
                return (
                    <div key={`${props.pKey}-columns-${aColumn}-${aIdx}`}>
                        {aColumn === 'columns' && props.pColumnList.length > 0 && (
                            <div key={`${props.pKey}-columns-columns-${aColumn}-${aIdx}-content`}>
                                {!props.pShowHiddenObj && (props.pIndexList.length > 0 || props.pRollupList.length > 0) && <LabelDiv pTxt={aColumn} />}
                                {props.pColumnList.map((bColumn, bIdx: number) => {
                                    return (
                                        checkDisplay('column', bColumn) && (
                                            <div className="table-column-content" key={`${props.pKey}-columns-${aColumn}-${aIdx}-${bColumn}-${bIdx}`}>
                                                <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                    <GoDotFill></GoDotFill>
                                                </span>
                                                <div className="table-column-content-row">
                                                    <span className="l-txt">{bColumn[0]}</span>
                                                    <div className="r-txt">
                                                        {getColumnType(bColumn[1] as number) + ' '}
                                                        {bColumn[1] === 5 && `(${bColumn[2]})`}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    );
                                })}
                            </div>
                        )}
                        {aColumn === 'index' && props.pIndexList.length > 0 && checkDisplay('index') && (
                            <div key={`${props.pKey}-columns-index-${aColumn}-${aIdx}-content`}>
                                <LabelDiv pTxt={aColumn} />
                                {props.pIndexList.map((aIndex, aIdx: number) => {
                                    return (
                                        <div className="table-column-content" key={`${props.pKey}-columns-index-${aColumn}-${aIndex}-${aIdx}`}>
                                            <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                <GoDotFill></GoDotFill>
                                            </span>
                                            <div className="table-column-content-row">
                                                <span className="l-txt">{aIndex[1]}</span>
                                                <div className="r-txt">
                                                    <span>{getIndexType(aIndex[2] as number)}</span>
                                                    <span style={{ marginLeft: '3px' }}>({aIndex[0]})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {aColumn === 'rollup' && props.pRollupList.length > 0 && checkDisplay('rollup') && (
                            <div key={`${props.pKey}-columns-rollup-${aColumn}-${aIdx}-content`}>
                                <LabelDiv pTxt={aColumn} />
                                {props.pRollupList.map((aRollup, aIdx: number) => {
                                    return (
                                        <div className="table-column-content" key={`${props.pKey}-columns-rollup-${aColumn}-${aRollup}-${aIdx}`}>
                                            <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                                <GoDotFill className={`fill-${aRollup[3] === 1 ? 'enable' : 'disable'}`}></GoDotFill>
                                            </span>
                                            <div className="table-column-content-row">
                                                <span className="l-txt">{aRollup[2]}</span>
                                                <div className="r-txt">
                                                    <span style={{ marginLeft: '3px' }}>{aRollup[1]}ms</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
};
interface LabelDivPropsType {
    pTxt: string;
}
const LabelDiv = (props: LabelDivPropsType): JSX.Element => {
    return <div className="table-wrap-label-content">{props.pTxt}</div>;
};

export default TableInfo;
