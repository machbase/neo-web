import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, gShellList } from '@/recoil/recoil';
import icons from '@/utils/icons';
import ShellMenu from './ShellMenu';
import { TbParachute } from '@/assets/icons/Icon';
import { extractionExtension } from '@/utils';
import { useMemo, useState } from 'react';

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
    const [sShellList] = useRecoilState<any>(gShellList);

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
            extension === 'dsh' ||
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

        if (sTypeOption === 'taz' || sTypeOption === 'dsh') {
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
            case 'tql':
                return icons('tql', true);
            case 'wrk':
                return icons('wrk', true);
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
            case 'taz':
                return icons('taz', true);
            case 'dsh':
                return icons('dsh', true);
            case 'fish':
                return icons('fish', true);
            default:
                return icons('none', true);
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
                          dashboard: {
                              variables: [],
                              timeRange: {
                                  start: 'now-3h',
                                  end: 'now',
                                  refresh: 'Off',
                              },
                              title: 'New dashboard',
                              panels: [],
                          },
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
    // return default menu style div
    const defaultMenuStyleDiv = (aIcon: JSX.Element, aTxt: string, aClickCallback?: any, aCallbackItem?: any): JSX.Element => {
        return (
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
                onClick={aClickCallback ? (event: any) => aClickCallback(event, aCallbackItem) : undefined}
            >
                <div className="home_btn">{aIcon}</div>
                <p>{aTxt}</p>
            </div>
        );
    };
    /** return shell list */
    const getShellList = useMemo((): any[] => {
        const sExtensionListWithoutTerm = pExtentionList && pExtentionList.filter((aExtension: any) => aExtension.type !== 'term');
        if (!sExtensionListWithoutTerm) return [];
        return sExtensionListWithoutTerm.concat(sShellList ?? []);
    }, [sShellList, pGetInfo]);

    return (
        <div className="inner">
            <div className="title">
                <p className="main_title">New...</p>
            </div>
            <div className="btn_wrap">
                {getShellList &&
                    getShellList.map((aItem: any) => {
                        return <ShellMenu key={aItem.id} pInfo={aItem} pChangeTabOption={changeTabOption} pSetIcon={setIcon} />;
                    })}
                {/* Drop & Open */}
                <label
                    onDragEnter={() => setFileUploadStyle(true)}
                    onDragOver={(aEvent) => handleDragOver(aEvent)}
                    onDragLeave={() => setFileUploadStyle(false)}
                    onDrop={(aEvent: any) => updateFile(aEvent, 'drag')}
                    style={{ position: 'relative' }}
                >
                    <input onChange={(aEvent: any) => updateFile(aEvent, 'click')} accept=".wrk,.sql,.tql,.taz,.dsh" className="uploader" type="file" />
                    {defaultMenuStyleDiv(<TbParachute />, sFileUploadStyle ? 'Drop here' : 'Drop & Open')}
                </label>
            </div>
        </div>
    );
};
export default NewBoard;
