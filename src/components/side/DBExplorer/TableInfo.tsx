import { getTableInfo } from '@/api/repository/api';
import { MuiFolderLayOut, MuiFolderLayOutOpen } from '@/assets/icons/Mui';
import { useState } from 'react';
import { GoDotFill } from 'react-icons/go';

const TableInfo = ({ pShowHiddenObj, pValue, pSetDBList, pDBList }: any) => {
    const [sCollapseTree, setCollapseTree] = useState(false);

    const getTableInfoData = async () => {
        const sData: any = await getTableInfo(pValue.info[2]);

        pSetDBList(
            pDBList.map((aItem: any) => {
                return aItem.info[2] === pValue.info[2] ? { ...aItem, child: sData.data.rows } : aItem;
            })
        );
        setCollapseTree(!sCollapseTree);
    };

    // const getTableFlag = (aFlagNumber: number) => {
    //     switch (aFlagNumber) {
    //         case 1:
    //             return '(data)';
    //         case 2:
    //             return '(rollup)';
    //         case 4:
    //             return '(meta)';
    //         case 8:
    //             return '(stat)';
    //         default:
    //             return '';
    //     }
    // };

    const getTableType = (aTypeNumber: number) => {
        switch (aTypeNumber) {
            case 0:
                return 'log';
            case 1:
                return 'fixed';
            case 3:
                return 'volatile';
            case 4:
                return 'lookup';
            case 5:
                return 'kv';
            case 6:
                return 'tag';
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
    function startsWithUnderscore(aStr: string) {
        if (!pShowHiddenObj) {
            return true;
        } else {
            if (typeof aStr !== 'string') {
                return false;
            }

            return aStr.charAt(0) !== '_';
        }
    }

    return (
        <>
            {startsWithUnderscore(pValue.info[3]) && (
                <div className="file-wrap" style={{ alignItems: 'baseline' }} onClick={() => getTableInfoData()}>
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                        <span className="icons">{sCollapseTree ? <MuiFolderLayOutOpen /> : <MuiFolderLayOut />}</span>
                        <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', margin: 'auto 0 auto 1px' }}>
                            {pValue.info[3]}
                        </span>
                    </div>
                    <div style={{ fontSize: '12px', whiteSpace: 'nowrap', opacity: '0.4', paddingRight: '4px' }}>{getTableType(pValue.info[4])}</div>
                </div>
            )}
            {sCollapseTree && (
                <div>
                    {pValue.child.map((aItem: any, aIdx: number) => {
                        return (
                            startsWithUnderscore(pValue.info[3]) &&
                            startsWithUnderscore(aItem[0]) && (
                                <div key={aIdx} className="file-wrap" style={{ alignItems: 'baseline', paddingLeft: ' 32px', cursor: 'unset' }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        <span className="icons" style={{ marginRight: '2px', opacity: '0.5' }}>
                                            <GoDotFill></GoDotFill>
                                        </span>
                                        <span
                                            style={{
                                                marginLeft: 1,
                                                fontSize: '13px',
                                                whiteSpace: 'nowrap',
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden',
                                                margin: 'auto 0 auto 1px',
                                            }}
                                        >
                                            {aItem[0]}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '12px', whiteSpace: 'nowrap', opacity: '0.4', paddingRight: '4px' }}>
                                        {getColumnType(aItem[1]) + ' '}
                                        {aItem[1] === 5 && `(${aItem[2]})`}
                                    </div>
                                </div>
                            )
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default TableInfo;
