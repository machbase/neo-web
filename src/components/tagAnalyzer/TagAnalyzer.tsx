import { fetchTablesData, getRollupTableList } from '@/api/repository/machiot';
import { gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import ChartBoard from './ChartBoard';
import { parseTables } from '@/utils';

const tagAnalyzer = ({ pInfo, pHandleSaveModalOpen, pSetIsSaveModal, pSetIsOpenModal }: any) => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTabls = useSetRecoilState(gRollupTableList);

    const handleSaveModalOpen = () => {
        pSetIsSaveModal(true);
    };
    const handleOpenModalOpen = () => {
        pSetIsOpenModal(true);
    };

    const getTables = async () => {
        const sResult: any = await fetchTablesData();
        if (sResult.success) {
            const sParseTables = parseTables(sResult.data);
            setTables(sParseTables);
        }
    };

    const getRollupTables = async () => {
        const sResult: any = await getRollupTableList();
        setRollupTabls(sResult);
    };

    useEffect(() => {
        getTables();
        getRollupTables();
    }, []);

    return (
        <ChartBoard pInfo={pInfo} pSetHandleSaveModalOpen={pHandleSaveModalOpen} pHandleSaveModalOpen={handleSaveModalOpen} pHandleOpenModalOpen={handleOpenModalOpen}></ChartBoard>
    );
};
export default tagAnalyzer;
