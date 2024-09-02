import './index.scss';
import { IconButton } from '../buttons/IconButton';
import { PiFileSqlThin } from 'react-icons/pi';
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
    pMaxWidth,
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
                          if (!!pMaxShowLen && aIdx + 1 === 6) {
                              return MaxLenDiv();
                          }
                          if (pMaxShowLen && aIdx + 1 > 6) return <></>;
                          if (aRowList.length === 1 && aRowList[0] === '') return;
                          return (
                              <tr key={'tbody-row' + aIdx} className={Number(aIdx) % 2 === 0 ? 'result-body-tr' : 'result-body-tr dark-odd'}>
                                  <td>
                                      <span className="row-num">{aIdx + 1}</span>
                                  </td>
                                  {aRowList.map((aRowData: any, bIdx: number) => {
                                      return (
                                          <td
                                              className="result-table-item"
                                              key={'table-' + aIdx + '-' + bIdx}
                                              //   onContextMenu={(e) => clickEvent(e, aRowData)}
                                          >
                                              <span>{'' + aRowData}</span>
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

export default TABLE;
