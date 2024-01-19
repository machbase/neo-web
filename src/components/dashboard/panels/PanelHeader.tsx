import { Delete, GearFill, Refresh, VscRecord } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { useState } from 'react';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pSetRefreshCount, pIsView }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sMouseDown, setMouseDown] = useState(false);
    const [sSelectedTab] = useRecoilState(gSelectedTab);

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

    return (
        <>
            <div
                onMouseDown={() => setMouseDown(true)}
                onMouseUp={() => setMouseDown(false)}
                style={
                    pType !== 'create' && pType !== 'edit'
                        ? !sMouseDown
                            ? {
                                  cursor: 'grab',
                              }
                            : {
                                  cursor: 'grabbing',
                              }
                        : {}
                }
                className="board-panel-header"
            >
                <div>{pPanelInfo.title}</div>
                <div className="panel-header-navigator">
                    <a data-tooltip-place="bottom" id="my-anchor-element">
                        {pPanelInfo.useCustomTime && <VscRecord color="#339900"></VscRecord>}
                        <Tooltip
                            className="tooltip"
                            anchorSelect="#my-anchor-element"
                            content={`${pPanelInfo.timeRange.start} ~ ${pPanelInfo.timeRange.end} , ${pPanelInfo.timeRange.refresh}`}
                        />
                    </a>

                    <span className="delete">
                        <IconButton
                            pDisabled={pIsView}
                            pWidth={25}
                            pIcon={<Refresh size={14} />}
                            onClick={() =>
                                pSetRefreshCount((Prev: any) => {
                                    return Prev + 1;
                                })
                            }
                        />
                    </span>
                    {pType !== 'create' && pType !== 'edit' && (
                        <>
                            <span className="delete">
                                <IconButton
                                    pDisabled={pIsView}
                                    pWidth={25}
                                    pIcon={<GearFill size={14} />}
                                    onClick={(aEvent: any) => {
                                        aEvent.stopPropagation();
                                        pShowEditPanel('edit', pPanelInfo.id);
                                    }}
                                />
                            </span>
                            <span className="delete">
                                <IconButton pDisabled={pIsView} pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />
                            </span>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
export default PanelHeader;
