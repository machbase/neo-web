import './statzTableModal.scss';
import Modal from '@/components/modal/Modal';
import { fetchQuery } from '@/api/repository/database';
import { ArrowLeft, ArrowRight, Close } from '@/assets/icons/Icon';
import { useEffect, useMemo, useState } from 'react';
import { E_TABLE_INFO, FetchCommonType } from './utils';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';

interface VirtualTableProps {
    pModalInfo: {
        state: boolean;
        filter: string;
        table: any;
        recordCnt: number;
    };
    pSetModalInfo: React.Dispatch<React.SetStateAction<{ state: boolean; filter: string; table: any; recordCnt: number }>>;
}

const FETCH_LIMIT = 10;
const TIME_24 = 'YYYY-MM-DD HH24:MI:SS';
const ToCharTime = (aColumn: string) => `TO_CHAR(${aColumn}, '${TIME_24}') as '${aColumn}'`;
// const ToCharValue = (aColumn: string) => `TO_CHAR(${aColumn} ,'N0') as '${aColumn}'`;
const ToCharValue = (aColumn: string) => `${aColumn}`;

export const StatzTableModal = ({ pModalInfo, pSetModalInfo }: VirtualTableProps) => {
    const [sStatzList, setStatzInfo] = useState<FetchCommonType>();
    const [sPage, setPage] = useState<number>(1);

    const FetchTable = async () => {
        let sCurPage = sPage ? sPage : 1;
        if (sCurPage > getMaxPageNum) sCurPage = getMaxPageNum;
        if (sCurPage < 1) sCurPage = 1;
        const sQuery = `SELECT NAME, ${ToCharValue('ROW_COUNT')}, ${ToCharTime('MAX_TIME')}, ${ToCharTime('MAX_TIME')}, MIN_VALUE, ${ToCharTime(
            'MIN_VALUE_TIME'
        )}, MAX_VALUE, ${ToCharTime('MAX_VALUE_TIME')}, ${ToCharTime('RECENT_ROW_TIME')} FROM ${pModalInfo.table[E_TABLE_INFO.DB_NM]}.${pModalInfo.table[E_TABLE_INFO.USER_NM]}.V$${
            pModalInfo.table[E_TABLE_INFO.TB_NM]
        }_STAT${pModalInfo?.filter ? " WHERE NAME LIKE '%" + pModalInfo.filter + "%'" : ''} LIMIT ${(sCurPage - 1) * FETCH_LIMIT}, ${FETCH_LIMIT}`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) setStatzInfo(svrData);
        else setStatzInfo(undefined);
    };
    const handleClose = () => {
        pSetModalInfo({ state: false, filter: '', table: undefined, recordCnt: 1 });
    };
    const handlePagination = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPage(e?.target?.value as any);
    };

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(pModalInfo.recordCnt / FETCH_LIMIT);
    }, [pModalInfo.recordCnt]);

    useEffect(() => {
        FetchTable();
    }, [sPage]);
    useEffect(() => {
        if (pModalInfo.state) FetchTable();
    }, [pModalInfo]);

    return pModalInfo.state ? (
        <div className="statz-table-modal-wrap">
            <Modal pIsDarkMode className="statz-table-modal" onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="statz-table-modal-header">
                        <ExtensionTab.ContentBlock pHoverNone>
                            <ExtensionTab.DpRowBetween>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
                                    <ExtensionTab.SubTitle>Statz</ExtensionTab.SubTitle>
                                    {pModalInfo?.filter && <ExtensionTab.ContentDesc>Filtered by '{pModalInfo.filter}'</ExtensionTab.ContentDesc>}
                                </div>
                                <Close style={{ cursor: 'pointer' }} onClick={handleClose} />
                            </ExtensionTab.DpRowBetween>
                        </ExtensionTab.ContentBlock>
                    </div>
                </Modal.Header>
                {sStatzList && sStatzList?.rows && sStatzList?.rows?.length > 0 ? (
                    <ExtensionTab.Table pList={sStatzList} />
                ) : (
                    <ExtensionTab.ContentBlock>
                        <ExtensionTab.ContentText pContent="N/A" />
                    </ExtensionTab.ContentBlock>
                )}
                <Modal.Footer>
                    <ExtensionTab.ContentBlock pHoverNone>
                        <div className="statz-table-modal-pagination">
                            <button disabled={sPage <= 1} style={sPage <= 1 ? { opacity: 0.4, cursor: 'not-allowed' } : {}} onClick={() => setPage(1)}>
                                <MdKeyboardDoubleArrowLeft width={16} height={16} />
                            </button>
                            <button
                                disabled={sPage <= 1 || !Number(sPage) ? true : false}
                                style={sPage <= 1 || !Number(sPage) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                onClick={() => setPage(() => parseInt(sPage as any) - 1)}
                            >
                                <ArrowLeft />
                            </button>
                            <div className="statz-table-modal-input-wrapper">
                                <input
                                    value={sPage}
                                    id="statz-custom-input"
                                    name="statz-page-input"
                                    type="number"
                                    disabled={getMaxPageNum === 1 && pModalInfo.recordCnt === 1}
                                    style={getMaxPageNum === 1 && pModalInfo.recordCnt === 1 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                    onChange={handlePagination}
                                    // TODO
                                    // + Debounce
                                    // + Event onKeyDown={() => {}}
                                />
                            </div>
                            <button
                                disabled={sPage >= getMaxPageNum}
                                style={sPage >= getMaxPageNum ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                onClick={() => setPage(() => parseInt(sPage as any) + 1)}
                            >
                                <ArrowRight />
                            </button>
                            <button
                                disabled={sPage >= getMaxPageNum}
                                style={sPage >= getMaxPageNum ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                onClick={() => setPage(getMaxPageNum)}
                            >
                                <MdOutlineKeyboardDoubleArrowRight />
                            </button>
                        </div>
                    </ExtensionTab.ContentBlock>
                </Modal.Footer>
            </Modal>
        </div>
    ) : null;
};
