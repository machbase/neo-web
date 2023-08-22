import { fetchTablesData } from '@/api/repository/machiot';
import { gTables } from '@/recoil/recoil';
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import ChartBoard from './ChartBoard';

const tagAnalyzer = ({ pInfo, pHandleSaveModalOpen, pSetIsSaveModal, pSetIsOpenModal }: any) => {
    const setTables = useSetRecoilState(gTables);

    const handleSaveModalOpen = () => {
        pSetIsSaveModal(true);
    };
    const handleOpenModalOpen = () => {
        pSetIsOpenModal(true);
    };

    const getTables = async () => {
        const sResult: any = await fetchTablesData();
        if (sResult.success) {
            const sIdx = sResult.data.columns.findIndex((aItem: any) => aItem === 'NAME');

            const newTable = sResult.data.rows.filter((aItem: any) => aItem[4] === 'Tag Table');

            const tagTableList = newTable.map((aItem: any) => aItem[sIdx]);
            setTables(tagTableList);
        }
    };

    useEffect(() => {
        getTables();
    }, []);

    return (
        <ChartBoard pInfo={pInfo} pSetHandleSaveModalOpen={pHandleSaveModalOpen} pHandleSaveModalOpen={handleSaveModalOpen} pHandleOpenModalOpen={handleOpenModalOpen}></ChartBoard>
    );
};
export default tagAnalyzer;
