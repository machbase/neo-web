import { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { MonacoEditor } from '@/components/monaco/MonacoEditor';
import { IconButton } from '@/components/buttons/IconButton';
import { Save, SaveAs } from '@/assets/icons/Icon';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import './TextExtension.scss';

export interface TextExtensionProps {
    pLang: 'json' | 'go' | 'typescript' | 'markdown';
    pHandleSaveModalOpen: () => void;
    setIsOpenModal: Dispatch<SetStateAction<boolean>>;
}

export const TextExtension = (props: TextExtensionProps) => {
    const { pLang, pHandleSaveModalOpen, setIsOpenModal } = props;
    const [sText, setText] = useState<string>('');
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);

    useEffect(() => {
        const sIsExist = sBoardList.findIndex((aItem) => aItem.id === sSelectedTab);
        if (sIsExist !== -1 && sBoardList[sIsExist].code) {
            if (typeof sBoardList[sIsExist].code === 'object') {
                setText(JSON.stringify(sBoardList[sIsExist].code, null, 4));
            } else {
                setText(sBoardList[sIsExist].code);
            }
        }
    }, []);

    const handleChangeText = (aValue: any) => {
        setText(aValue);

        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab ? { ...aItem, code: aValue } : aItem;
            })
        );
    };

    return (
        <div className="textextension-editor">
            <div className="textextension-editor-header">
                <IconButton pIcon={<Save size={18} />} onClick={pHandleSaveModalOpen} />
                <IconButton pIcon={<SaveAs size={18} />} onClick={() => setIsOpenModal(true)} />
            </div>
            <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
                <MonacoEditor pText={sText} pLang={pLang} onSelectLine={() => {}} onChange={handleChangeText} onRunCode={() => null} />
            </div>
        </div>
    );
};
