// The New tab as it was before the widget board (issue-1510). MainContent shows it while the
// experiment flag is off; the widget board in ../index.tsx shows with it on.
import './index.scss';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, gShellList } from '@/recoil/recoil';
import icons from '@/utils/icons';
import ShellMenu from './ShellMenu';
import { TbParachute } from '@/assets/icons/Icon';
import { extractionExtension } from '@/utils';
import { useMemo, useState } from 'react';
import { Page, Toast } from '@/design-system/components';
import { OPEN_FILE_ACCEPT, parseOpenedFile } from '../openFileContent';
import { TAZ_FORMAT_VERSION } from '@/components/tagAnalyzer/persistence/tazFormat';

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
        return (await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                resolve(e.target.result);
            };
            reader.onerror = () => reject(reader.error ?? new Error('Failed to read the file.'));
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
            let sResult: string;
            try {
                sResult = await readFile(sFile);
            } catch (aError) {
                Toast.error(aError instanceof Error ? aError.message : 'Failed to read the file.', { testId: 'new-board-open-file-error-toast' });
                return;
            }
            uploadFile(sFile, sResult);
        }
    };

    const uploadFile = (aFileInfo: any, aFileValue: string) => {
        const sTypeOption = extractionExtension(aFileInfo.name);
        const sOpened = parseOpenedFile(sTypeOption, aFileValue, aFileInfo.name, sSelectedTab);
        if (!sOpened.ok) {
            Toast.error(sOpened.error, { testId: 'new-board-open-file-error-toast' });
            return;
        }
        setBoardList(
            sBoardList.map((aItem: any) => {
                if (aItem.id !== sSelectedTab) return aItem;
                // dsh/taz replace the whole tab; text/wrk merge into it
                return sOpened.mode === 'replace' ? { ...sOpened.board, id: aItem.id } : { ...aItem, ...sOpened.fields };
            })
        );
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
                    aType.icon === 'laptop' ||
                    aType.icon === 'fish' ||
                    aType.icon === 'console'
                ) {
                    return icons(aType.icon, true);
                } else {
                    return icons('term', true);
                }
            case 'taz':
                return icons('taz', true);
            case 'dsh':
                return icons('dsh', true);
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
                          version: aValue.type === 'taz' ? TAZ_FORMAT_VERSION : bItem.version,
                          boardTimeRange: aValue.type === 'taz' ? { start: '', end: '' } : bItem.boardTimeRange,
                          boardNumericRange: aValue.type === 'taz' ? { start: '', end: '' } : bItem.boardNumericRange,
                          shell: { icon: aValue.icon, theme: aValue.theme ? aValue.theme : '', id: aValue.id ? aValue.id : 'SHELL' },
                          dashboard: {
                              variables: [],
                              timeRange: {
                                  start: 'now-1h',
                                  end: 'now',
                                  refresh: 'Off',
                              },
                              distanceRange: {
                                  start: '',
                                  end: '',
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
        <Page>
            <Page.Header>New...</Page.Header>
            <Page.Body>
                <Page.ContentBlock pHoverNone>
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
                            <input onChange={(aEvent: any) => updateFile(aEvent, 'click')} accept={OPEN_FILE_ACCEPT} className="uploader" type="file" />
                            {defaultMenuStyleDiv(<TbParachute />, sFileUploadStyle ? 'Drop here' : 'Drop & Open')}
                        </label>
                    </div>
                </Page.ContentBlock>
            </Page.Body>
        </Page>
    );
};
export default NewBoard;
