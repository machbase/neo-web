import './index.scss';
import { PiFileSqlThin } from 'react-icons/pi';
import { useMemo, useState } from 'react';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Copy } from '@/assets/icons/Icon';
import { FaCheck } from 'react-icons/fa';

/**
 * @param pTableData
 * @returns
 */

interface TableProps {
    pTableData: any;
    pMaxShowLen?: boolean;
    pHelpText?: string;
    pMaxWidth?: number;
    clickEvent?: (e: any, aRowData: string) => void;
}

enum COLUMN_TYPE {
    STRING = 'string', // equal => COLUMN_TYPE_VARCHAR, COLUMN_TYPE_TEXT, COLUMN_TYPE_JSON
}

const TABLE = ({
    pTableData,
    pMaxShowLen,
    pHelpText,
    pMaxWidth,
}: // clickEvent
TableProps) => {
    const stringTypeIdx = useMemo(() => {
        return pTableData?.types?.findIndex((val: string) => val === COLUMN_TYPE.STRING);
    }, [pTableData?.columns]);
    const MaxLenDiv = () => {
        return (
            <tr key="tbody-row5" className="result-body-tr">
                <td>
                    <span style={{ marginLeft: '20px', cursor: 'default' }}>...</span>
                </td>

                {pTableData.columns.map((aItem: any) => {
                    return (
                        <td key={'columns' + aItem} className="result-table-item">
                            <span>...</span>
                        </td>
                    );
                })}
            </tr>
        );
    };
    return (
        <table className="table">
            <thead className="table-header header-fix">
                {pTableData && pTableData.columns ? (
                    <tr>
                        <th>{pHelpText !== undefined && pHelpText ? <PiFileSqlThin /> : <span style={{ marginLeft: '20px', cursor: 'default' }} />}</th>
                        {pTableData.columns.map((aColumn: string) => {
                            return (
                                <th key={aColumn} style={{ cursor: 'default' }}>
                                    <span>{aColumn}</span>
                                </th>
                            );
                        })}
                    </tr>
                ) : (
                    <></>
                )}
            </thead>
            <tbody className="table-body">
                {pTableData && pTableData.rows
                    ? pTableData.rows.map((aRowList: any, aIdx: number) => {
                          if (!!pMaxShowLen && aIdx + 1 === 6) return MaxLenDiv();
                          if (pMaxShowLen && aIdx + 1 > 6) return <></>;
                          if (aRowList.length === 1 && aRowList[0] === '') return;
                          return (
                              <tr key={'tbody-row' + aIdx} className={Number(aIdx) % 2 === 0 ? 'result-body-tr' : 'result-body-tr dark-odd'}>
                                  <td>
                                      <span className="row-num">{aIdx + 1}</span>
                                  </td>
                                  {aRowList.map((aRowData: any, bIdx: number) => {
                                      return (
                                          <td className="result-table-item" key={'table-' + aIdx + '-' + bIdx}>
                                              <div className="result-table-item-copy-button" style={bIdx === stringTypeIdx && aRowData.length > 31 ? { display: 'flex' } : {}}>
                                                  <span>{aRowData}</span>
                                                  {bIdx === stringTypeIdx && aRowData.length > 31 && <Text aRowData={aRowData} />}
                                              </div>
                                          </td>
                                      );
                                  })}
                              </tr>
                          );
                      })
                    : null}
            </tbody>
        </table>
    );
};

const Text = ({ aRowData }: { aRowData: string }) => {
    const [copy, setCopy] = useState(false);

    const handle = () => {
        if (copy) return;
        setCopy(true);
        ClipboardCopy(aRowData);
        setTimeout(() => {
            setCopy(false);
        }, 600);
    };
    return (
        <div onClick={handle}>
            {copy && <FaCheck />}
            {!copy && <Copy />}
        </div>
    );
};

export default TABLE;
