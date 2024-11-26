import './index.scss';
import { PiFileSqlThin } from 'react-icons/pi';
import { useState } from 'react';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { Copy } from '@/assets/icons/Icon';
import { FaCheck } from 'react-icons/fa';
import { IconButton } from '../buttons/IconButton';

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

const TABLE = ({
    pTableData,
    pMaxShowLen,
    pHelpText,
    pMaxWidth = 25,
}: // clickEvent
TableProps) => {
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
                        <th>
                            {pHelpText !== undefined && pHelpText ? (
                                <IconButton
                                    pWidth={20}
                                    pHeight={20}
                                    pIsActive={false}
                                    pIsActiveHover={false}
                                    pIsToopTip
                                    pToolTipMaxWidth={pMaxWidth}
                                    pToolTipContent={pHelpText}
                                    pToolTipId="sql-result-tab"
                                    pIcon={<div style={{ width: '16px', height: '16px', marginLeft: '32px', cursor: 'default' }}>{<PiFileSqlThin />}</div>}
                                    onClick={() => {}}
                                />
                            ) : (
                                <span style={{ marginLeft: '20px', cursor: 'default' }} />
                            )}
                        </th>
                        {pTableData.columns.map((aColumn: string) => {
                            return (
                                <th key={aColumn} style={{ cursor: 'default' }}>
                                    <span>{aColumn?.toString()}</span>
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
                                              <div className="result-table-item-copy-button" style={{ display: 'flex' }}>
                                                  <span>{aRowData?.toString()}</span>
                                                  {!(aRowData === null) && aRowData?.toString().trim() !== '' && <Text aRowData={aRowData} />}
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
        <div className="result-table-item-copy-button-icon" onClick={handle}>
            {copy && <FaCheck />}
            {!copy && <Copy />}
        </div>
    );
};

export default TABLE;
