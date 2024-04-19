import { generateUUID } from '@/utils';
import { MouseEvent } from 'react';
import { IconButton } from '@/components/buttons/IconButton';
import { Delete } from '@/assets/icons/Icon';
import moment from 'moment';
import './index.scss';

interface TableProps {
    pTableData: { columns: string[]; rows: any[] };
    pIsContext?: boolean;
    clickEvent?: (e: any, aRowData: string) => void;
}

export const DefaultTable = ({ pTableData, pIsContext = false, clickEvent }: TableProps) => {
    /** check time format */
    const isTimeFormat = (aTxt: string): boolean => {
        if (aTxt === '0') return false;
        if (Number(aTxt)) return false;
        const sDate = new Date(aTxt);
        return moment(sDate).isValid();
    };
    /** return local time */
    const getTime = (aTxt: string): string => {
        const sDate = new Date(aTxt);
        return moment(sDate).format('yyyy-MM-DD HH:mm:ss');
    };

    return (
        <table className="default-table">
            <thead className="table-header header-fix">
                {pTableData && pTableData.columns ? (
                    <tr>
                        {pTableData.columns.map((aColumn: string, aIdx: number) => {
                            return (
                                <th key={aColumn + '-' + aIdx} style={{ cursor: 'default' }}>
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
                          return (
                              <tr key={'tbody-row' + aIdx} className={Number(aIdx) % 2 === 0 ? 'result-body-tr' : 'result-body-tr dark-odd'}>
                                  {aRowList.map((aRowData: any) => {
                                      return (
                                          <td className="result-table-item" key={generateUUID()}>
                                              {isTimeFormat(aRowData) ? <span>{getTime(aRowData)}</span> : <span>{aRowData}</span>}
                                          </td>
                                      );
                                  })}
                                  {clickEvent && (
                                      <td className="result-table-item">
                                          {pIsContext ? <></> : <IconButton pWidth={25} pHeight={25} pIcon={<Delete />} onClick={(e: MouseEvent) => clickEvent(e, aRowList[1])} />}
                                      </td>
                                  )}
                              </tr>
                          );
                      })
                    : null}
            </tbody>
        </table>
    );
};
