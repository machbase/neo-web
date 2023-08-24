import './index.scss';
/**
 * @param pTableData
 * @returns
 */
const TABLE = ({ pTableData, pMaxShowLen, clickEvent }: { pTableData: any; pMaxShowLen?: boolean; clickEvent: (e: any, aRowData: string) => void }) => {
    const MaxLenDiv = () => {
        return (
            <tr key={'tbody-row5'} className="result-body-tr">
                <td>
                    <span style={{ marginLeft: '20px', cursor: 'default' }}>...</span>
                </td>

                {pTableData.columns.map(() => {
                    return (
                        <td className="result-table-item">
                            <span>...</span>
                        </td>
                    );
                })}
            </tr>
        );
    };
    return (
        <table className="table">
            <thead className="table-header header-fix" style={{ height: '40px' }}>
                {pTableData && pTableData.columns ? (
                    <tr>
                        <th>
                            <span style={{ marginLeft: '20px', cursor: 'default' }}>ROWNUM</span>
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
                {pTableData && pTableData.rows ? (
                    pTableData.rows.map((aRowList: any, aIdx: number) => {
                        if (!!pMaxShowLen && aIdx + 1 === 6) {
                            return MaxLenDiv();
                        }
                        if (pMaxShowLen && aIdx + 1 > 6) return <></>;
                        if (aRowList.length === 1 && aRowList[0] === '') return;
                        return (
                            <tr key={'tbody-row' + aIdx} className={Number(aIdx) % 2 === 0 ? 'result-body-tr' : 'result-body-tr dark-odd'}>
                                <td>
                                    <span style={{ marginLeft: '20px', cursor: 'default' }}>{aIdx + 1}</span>
                                </td>
                                {aRowList.map((aRowData: any, bIdx: number) => {
                                    return (
                                        <td className="result-table-item" key={aRowData + bIdx} onContextMenu={(e) => clickEvent(e, aRowData)}>
                                            <span>{aRowData}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })
                ) : (
                    <></>
                )}
            </tbody>
        </table>
    );
};

export default TABLE;
