import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import icons from '@/utils/icons';
import { FileUploader } from 'react-drag-drop-files';
import { getTutorial } from '@/api/repository/api';
import ShellMenu from './ShellMenu';
import { TbParachute, Folder, FolderOpen } from '@/assets/icons/Icon';

interface NewBoardProps {
    pExtentionList: any;
    pRecentFiles: any;
    pReferences: any;
    setIsOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
    pGetInfo: any;
}

const NewBoard = (props: NewBoardProps) => {
    const { pExtentionList, setIsOpenModal, pGetInfo, pReferences } = props;
    const fileTypes = ['wrk', 'sql', 'tql', 'taz'];
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab] = useRecoilState<any>(gSelectedTab);

    const openReference = async (aValue: any) => {
        if (aValue.type === 'url') {
            window.open(aValue.address, aValue.target);
        } else {
            const sContentResult: any = await getTutorial(aValue.address);
            if (aValue.type === 'tql') {
                setBoardList(
                    sBoardList.map((aItem) => {
                        return aItem.id === sSelectedTab
                            ? { ...aItem, type: aValue.type, name: aValue.title, code: sContentResult, path: '', panels: [], sheet: [], savedCode: false }
                            : aItem;
                    })
                );
            } else if (aValue.type === 'wrk') {
                setBoardList(
                    sBoardList.map((aItem) => {
                        return aItem.id === sSelectedTab
                            ? { ...aItem, type: aValue.type, name: aValue.title, code: '', panels: [], path: '', sheet: sContentResult.data, savedCode: false }
                            : aItem;
                    })
                );
            }
        }
    };
    const readFile = async (aItem: any) => {
        return (await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                resolve(e.target.result);
            };
            reader.readAsText(aItem);
        })) as string;
    };

    const handleChange = async (aEvent: any) => {
        const sFile = aEvent;
        const extension = sFile.name.slice(-4);
        if (extension === '.wrk' || extension === '.sql' || extension === '.tql' || extension === '.taz') {
            const sResult: string = await readFile(sFile);
            uploadFile(sFile, sResult);
        }
    };

    const uploadFile = (aFileInfo: any, aFileValue: string) => {
        const sTypeOption = aFileInfo.name.slice(-3);

        if (sTypeOption === 'taz') {
            setBoardList(
                sBoardList.map((aItem: any) => {
                    return aItem.id === sSelectedTab ? { ...JSON.parse(aFileValue), id: aItem.id } : aItem;
                })
            );
        } else if (sTypeOption === 'sql' || sTypeOption === 'tql') {
            setBoardList(
                sBoardList.map((aItem: any) => {
                    return aItem.id === sSelectedTab ? { ...aItem, name: aFileInfo.name, code: aFileValue, type: sTypeOption } : aItem;
                })
            );
        } else if (sTypeOption === 'wrk') {
            setBoardList(
                sBoardList.map((aItem: any) => {
                    return aItem.id === sSelectedTab ? { ...aItem, name: aFileInfo.name, sheet: JSON.parse(aFileValue).data, type: sTypeOption } : aItem;
                })
            );
        }
    };

    const setIcon = (aType: any) => {
        switch (aType.type) {
            case 'sql':
                return icons('sql');
                break;
            case 'tql':
                return icons('tql');
                break;
            case 'wrk':
                return icons('wrk');
                break;
            case 'term':
                if (
                    aType.icon === 'console-network-outline' ||
                    aType.icon === 'console-network' ||
                    aType.icon === 'database-outline' ||
                    aType.icon === 'database' ||
                    aType.icon === 'console-line' ||
                    aType.icon === 'powershell' ||
                    aType.icon === 'monitor' ||
                    aType.icon === '8'
                ) {
                    return icons(aType.icon);
                } else {
                    return icons('term');
                }
                break;
            case 'taz':
                return icons('taz');
                break;
            default:
                return icons('none');
                break;
        }
    };

    const changeTabOption = (aEvent: any, aValue: any) => {
        aEvent.preventDefault();
        setBoardList(
            sBoardList.map((bItem) => {
                return bItem.id === sSelectedTab
                    ? {
                          ...bItem,
                          type: aValue.type,
                          name: aValue.label,
                          panels: [],
                          sheet: [],
                          savedCode: false,
                          shell: { icon: aValue.icon, theme: aValue.theme ? aValue.theme : '', id: aValue.id ? aValue.id : 'SHELL' },
                      }
                    : bItem;
            })
        );
    };

    return (
        <div className="inner">
            <div className="title">
                <p className="main_title">New...</p>
            </div>
            <div className="btn_wrap">
                {pExtentionList.map((aItem: any, aIdx: number) => {
                    return <ShellMenu key={aIdx} pInfo={aItem} pChangeTabOption={changeTabOption} pSetIcon={setIcon} pGetInfo={pGetInfo}></ShellMenu>;
                })}
                <FileUploader
                    classes="drag-drop"
                    children={
                        <div className="home_btn_box">
                            <div className="home_btn">
                                <TbParachute></TbParachute>
                            </div>
                            <p>Drop & Open</p>
                        </div>
                    }
                    handleChange={handleChange}
                    name="file"
                    types={fileTypes}
                />
            </div>
            <div className="divider"></div>
            <div className="file_tree_section">
                <div className="side">
                    <div className="file_btn_wrapper">
                        <div className="file_btn" onClick={() => setIsOpenModal(true)}>
                            <FolderOpen />
                            <span>Open...</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="refrence-list">
                {pReferences &&
                    pReferences.map((aItem: any, aIdx: number) => {
                        return (
                            <div key={aIdx} className="folder-items">
                                <Folder></Folder>
                                {aItem.label}
                                {aItem?.items?.map((aItem: any, aIdx: number) => {
                                    return (
                                        <div key={aIdx} className="link" onClick={() => openReference(aItem)}>
                                            {icons(aItem.type)}
                                            {aItem.title}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
export default NewBoard;
