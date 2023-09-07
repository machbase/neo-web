import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import icons from '@/utils/icons';
import ShellMenu from './ShellMenu';
import { TbParachute } from '@/assets/icons/Icon';
import { extractionExtension } from '@/utils';
import { useState } from 'react';

interface NewBoardProps {
    pExtentionList: any;
    setIsOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
    pGetInfo: any;
}

const NewBoard = (props: NewBoardProps) => {
    const { pExtentionList, pGetInfo } = props;
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sFileUploadStyle, setFileUploadStyle] = useState(false);

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
        const extension = extractionExtension(sFile.name);
        if (
            extension === 'wrk' ||
            extension === 'sql' ||
            extension === 'tql' ||
            extension === 'taz' ||
            extension === 'json' ||
            extension === 'csv' ||
            extension === 'md' ||
            extension === 'txt'
        ) {
            const sResult: string = await readFile(sFile);
            uploadFile(sFile, sResult);
        }
    };

    const uploadFile = (aFileInfo: any, aFileValue: string) => {
        const sTypeOption = extractionExtension(aFileInfo.name);

        if (sTypeOption === 'taz') {
            setBoardList(
                sBoardList.map((aItem: any) => {
                    return aItem.id === sSelectedTab ? { ...JSON.parse(aFileValue), id: aItem.id } : aItem;
                })
            );
        } else if (sTypeOption === 'sql' || sTypeOption === 'tql' || sTypeOption === 'json' || sTypeOption === 'csv' || sTypeOption === 'md' || sTypeOption === 'txt') {
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
                return icons('sql', true);
                break;
            case 'tql':
                return icons('tql', true);
                break;
            case 'wrk':
                return icons('wrk', true);
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
                    aType.icon === 'monitor-small' ||
                    aType.icon === 'laptop'
                ) {
                    return icons(aType.icon, true);
                } else {
                    return icons('term', true);
                }
                break;
            case 'taz':
                return icons('taz', true);
                break;
            default:
                return icons('none', true);
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

    const handleDragOver = (aEvent: any) => {
        setFileUploadStyle(true);
        aEvent.stopPropagation();
        aEvent.preventDefault();
    };

    const updateFile = (aEvent: any, aType: string) => {
        setFileUploadStyle(false);
        if (aType === 'drag') {
            aEvent.preventDefault();
            handleChange(aEvent.dataTransfer.files[0]);
        } else {
            handleChange(aEvent.target.files[0]);
        }
    };

    return (
        <div className="inner">
            <div className="title">
                <p className="main_title">New...</p>
            </div>
            <div className="btn_wrap">
                {pExtentionList.map((aItem: any) => {
                    return <ShellMenu key={aItem.id} pInfo={aItem} pChangeTabOption={changeTabOption} pSetIcon={setIcon} pGetInfo={pGetInfo}></ShellMenu>;
                })}

                <label
                    onDragEnter={() => setFileUploadStyle(true)}
                    onDragOver={(aEvent) => handleDragOver(aEvent)}
                    onDragLeave={() => setFileUploadStyle(false)}
                    onDrop={(aEvent: any) => updateFile(aEvent, 'drag')}
                    style={{ position: 'relative' }}
                >
                    <input onChange={(aEvent: any) => updateFile(aEvent, 'click')} accept=".wrk,.sql,.tql,.taz" className="uploader" type="file" />
                    <div
                        style={
                            sFileUploadStyle
                                ? {
                                      border: '1px dashed rgba(255, 255, 255, 0.16)',
                                      backgroundColor: 'rgba(200, 200, 200, 0.24)',
                                  }
                                : {}
                        }
                        className="home_btn_box"
                    >
                        <div className="home_btn">
                            <TbParachute></TbParachute>
                        </div>
                        <p>{sFileUploadStyle ? 'Drop here' : 'Drop & Open'}</p>
                    </div>
                </label>
            </div>
        </div>
    );
};
export default NewBoard;
