import { fetchQuery } from '@/api/repository/database';
import { useEffect, useMemo, useState } from 'react';
import { E_TABLE_INFO, FetchCommonType } from './utils';
import { Modal, Page, Pagination } from '@/design-system/components';
import { useSchedule } from '@/hooks/useSchedule';
import moment from 'moment';

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
    const [sPageInput, setPageInput] = useState<string>('1');
    const [sLastUpdated, setLastUpdated] = useState<Date>(new Date());

    const FetchTable = async () => {
        let sCurPage = sPage ? sPage : 1;
        if (sCurPage > getMaxPageNum) sCurPage = getMaxPageNum;
        if (sCurPage < 1) sCurPage = 1;
        const sQuery = `SELECT NAME, ${ToCharValue('ROW_COUNT')}, ${ToCharTime('MIN_TIME')}, ${ToCharTime('MAX_TIME')}, MIN_VALUE, ${ToCharTime(
            'MIN_VALUE_TIME'
        )}, MAX_VALUE, ${ToCharTime('MAX_VALUE_TIME')}, ${ToCharTime('RECENT_ROW_TIME')} FROM ${pModalInfo.table[E_TABLE_INFO.DB_NM]}.${pModalInfo.table[E_TABLE_INFO.USER_NM]}.V$${
            pModalInfo.table[E_TABLE_INFO.TB_NM]
        }_STAT${pModalInfo?.filter ? " WHERE NAME LIKE '%" + pModalInfo.filter + "%'" : ''} LIMIT ${(sCurPage - 1) * FETCH_LIMIT}, ${FETCH_LIMIT}`;
        const { svrState, svrData } = await fetchQuery(sQuery);
        if (svrState) setStatzInfo(svrData);
        else setStatzInfo(undefined);
        setLastUpdated(new Date());
    };

    const handleClose = () => {
        pSetModalInfo({ state: false, filter: '', table: undefined, recordCnt: 1 });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        setPageInput(newPage.toString());
    };

    const handlePageInputChange = (value: string) => {
        setPageInput(value);
    };

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(pModalInfo.recordCnt / FETCH_LIMIT);
    }, [pModalInfo.recordCnt]);

    useEffect(() => {
        FetchTable();
    }, [sPage]);

    useEffect(() => {
        setPageInput(sPage.toString());
    }, [sPage]);

    useSchedule(FetchTable, 1000 * 3); // 3s

    return pModalInfo.state ? (
        <Modal.Root isOpen={pModalInfo.state} onClose={handleClose} size="lg" style={{ width: '80vw' }}>
            <Modal.Header>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Modal.Title style={{ fontSize: '24px' }}>
                            Real-Time Statistics of <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{pModalInfo?.table?.[E_TABLE_INFO.TB_NM]}</p> Table
                        </Modal.Title>
                        {pModalInfo?.filter && <Modal.TitleSub>Filtered by '{pModalInfo.filter}'</Modal.TitleSub>}
                    </div>
                    <Modal.Close />
                </div>
            </Modal.Header>
            <Modal.Body>
                <Page>
                    {sStatzList && sStatzList?.rows && sStatzList?.rows?.length > 0 ? (
                        <Page.Table pList={sStatzList} stickyHeader />
                    ) : (
                        <Page.ContentBlock>
                            <Page.ContentText pContent="N/A" />
                        </Page.ContentBlock>
                    )}
                </Page>
            </Modal.Body>
            <Modal.Footer style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Page.ContentDesc>Last updated: {moment(sLastUpdated)?.format('YYYY-MM-DD HH:mm:ss')}</Page.ContentDesc>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Pagination currentPage={sPage} totalPages={getMaxPageNum} onPageChange={handlePageChange} onPageInputChange={handlePageInputChange} inputValue={sPageInput} />
                </div>
            </Modal.Footer>
        </Modal.Root>
    ) : null;
};
