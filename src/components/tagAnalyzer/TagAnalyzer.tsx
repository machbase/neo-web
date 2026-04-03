import { fetchTablesData, getRollupTableList } from '@/api/repository/machiot';
import { gRollupTableList, gTables } from '@/recoil/recoil';
import { useEffect, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import TagAnalyzerBoard from './TagAnalyzerBoard';
import { parseTables } from '@/utils';
import type {
    TagAnalyzerInfoProp,
    TagAnalyzerOnSaveProp,
    TagAnalyzerSetIsOpenModalProp,
    TagAnalyzerSetIsSaveModalProp,
} from './TagAnalyzerType';

// Loads the table metadata needed by TagAnalyzer and then hands the selected board
// to the main chart workspace once the required rollup data is ready.
const TagAnalyzer = ({ 
    pInfo , 
    pHandleSaveModalOpen: pOnSave, 
    pSetIsSaveModal
}: {
    pInfo: TagAnalyzerInfoProp;
    pHandleSaveModalOpen: TagAnalyzerOnSaveProp;
    pSetIsSaveModal: TagAnalyzerSetIsSaveModalProp;
    pSetIsOpenModal: TagAnalyzerSetIsOpenModalProp;
}) => {
    const setTables = useSetRecoilState(gTables);
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sIsLoadRollupTable, setIsLoadRollupTable] = useState<boolean>(true);

    const openSaveModal = () => {
        pSetIsSaveModal(true);
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
        setIsLoadRollupTable(false);
    };

    useEffect(() => {
        setIsLoadRollupTable(true);
        getTables();
        getRollupTables();
    }, []);

    return (
        // Render after rollup info load
        !sIsLoadRollupTable && (
            <TagAnalyzerBoard
                pInfo={pInfo}
                pOnSave={pOnSave}
                pOnOpenSaveModal={openSaveModal}
            />
        )
    );
};
export default TagAnalyzer;
