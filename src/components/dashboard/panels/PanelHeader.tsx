import { Delete, GearFill, VscRecord, GoGrabber } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString } from '@/utils';
import Menu from '@/components/contextMenu/Menu';
import { useState, useRef } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView, pIsHeader }: any) => {
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const sHeaderId = generateRandomString();
    const sMenuRef = useRef<HTMLDivElement>(null);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sSelectedTab
                    ? {
                          ...aItem,
                          dashboard: {
                              ...aItem.dashboard,
                              panels: aItem.dashboard.panels.filter((aItem: any) => aItem.id !== pPanelInfo.id),
                          },
                      }
                    : aItem;
            })
        );
    };

    const handleContextMenu = (aEvent: React.MouseEvent) => {
        aEvent.preventDefault();
        setIsContextMenu(true);
    };

    const handleDeleteOnMenu = (aEvent: React.MouseEvent) => {
        aEvent.stopPropagation();
        removePanel();
        setIsContextMenu(false);
    };

    const handleMoveEditOnMenu = (aEvent: React.MouseEvent, aPanelId: string) => {
        aEvent.stopPropagation();
        pShowEditPanel('edit', aPanelId);
        setIsContextMenu(false);
    };

    useOutsideClick(sMenuRef, () => setIsContextMenu(false));

    return (
        <>
            <div ref={sMenuRef} className={`draggable-panel-header ${pIsHeader || pType !== undefined ? 'display-none' : ''}`}>
                <GoGrabber size={20} color={pPanelInfo.theme !== 'dark' ? 'black' : ''} onContextMenu={handleContextMenu} />
                <div className="hidden-header-menu">
                    <Menu isOpen={sIsContextMenu}>
                        <Menu.Item onClick={(aEvent: any) => handleMoveEditOnMenu(aEvent, pPanelInfo.id)}>
                            <GearFill />
                            <span>Setting</span>
                        </Menu.Item>
                        <Menu.Item onClick={handleDeleteOnMenu}>
                            <Delete />
                            <span>Delete</span>
                        </Menu.Item>
                    </Menu>
                </div>
            </div>
            <div
                className={`board-panel-header ${!pIsHeader ? 'display-none' : ''} ${pPanelInfo.theme !== 'dark' ? 'panel-theme-white' : ''} ${
                    pType === undefined ? 'cursor-grab' : ''
                }`}
            >
                <div>{pPanelInfo.title}</div>
                <div className={`panel-header-navigator ${pType !== undefined ? 'display-none' : ''}`}>
                    <a data-tooltip-place="bottom" className={`panel-header-time-range ${!pPanelInfo.useCustomTime ? 'display-none' : ''}`} id={sHeaderId}>
                        <VscRecord color="#339900" />
                        <Tooltip
                            className="tooltip"
                            anchorSelect={'#' + sHeaderId}
                            content={`${pPanelInfo.timeRange.start} ~ ${pPanelInfo.timeRange.end} , ${pPanelInfo.timeRange.refresh}`}
                        />
                    </a>
                    <IconButton
                        pDisabled={pIsView}
                        pWidth={25}
                        pIcon={<GearFill size={14} />}
                        onClick={(aEvent: any) => {
                            aEvent.stopPropagation();
                            pShowEditPanel('edit', pPanelInfo.id);
                        }}
                    />
                    <IconButton pDisabled={pIsView} pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />
                </div>
            </div>
        </>
    );
};
export default PanelHeader;
