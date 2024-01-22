import { Delete, GearFill, VscRecord } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { useState } from 'react';
import './PanelHeader.scss';
import { Tooltip } from 'react-tooltip';
import { generateRandomString } from '@/utils';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pIsView }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sMouseDown, setMouseDown] = useState(false);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const sHeaderId = generateRandomString();

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
                className={`board-panel-header ${pPanelInfo.theme !== 'dark' ? 'panel-theme-white' : ''}`}
            >
                <div>{pPanelInfo.title}</div>
                <div className="panel-header-navigator">
                    {pPanelInfo.useCustomTime && pType === undefined && (
                        <>
                            <a data-tooltip-place="bottom" className="panel-header-time-range" id={sHeaderId}>
                                <VscRecord color="#339900" />
                            </a>
                            <Tooltip
                                className="tooltip"
                                anchorSelect={'#' + sHeaderId}
                                content={`${pPanelInfo.timeRange.start} ~ ${pPanelInfo.timeRange.end} , ${pPanelInfo.timeRange.refresh}`}
                            />
                        </>
                    )}

                    {/* <span className="delete">
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
                    </span> */}
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
