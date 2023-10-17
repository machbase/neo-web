import { Delete, GearFill } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { useState } from 'react';
import './PanelHeader.scss';
import CreatePanel from '../createPanel/CreatePanel';

const PanelHeader = ({ pShowEditPanel, pType, pPanelInfo, pBoardInfo }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sMouseDown, setMouseDown] = useState(false);
    const [sCreateModal, setCreateModal] = useState(false);

    const [sSelectedTab] = useRecoilState(gSelectedTab);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem: any) => {
                return aItem.id === sSelectedTab
                    ? {
                          ...aItem,
                          dashboard: {
                              ...aItem.dashboard,
                              panels: aItem.dashboard.panels.filter((aItem: any) => aItem.i !== pPanelInfo.i),
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
                <div>{pPanelInfo.panelName}</div>
                <div className="panel-header-navigator">
                    {pType !== 'create' && pType !== 'edit' && (
                        <span className="delete">{<IconButton pWidth={25} pIcon={<GearFill size={14} />} onClick={() => pShowEditPanel(true, pPanelInfo.i)} />}</span>
                    )}
                    {pType !== 'create' && pType !== 'edit' && (
                        <span className="delete">{<IconButton pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />}</span>
                    )}
                </div>
            </div>
            {/* {sCreateModal && <CreatePanel pType="edit" pBoardInfo={pBoardInfo} pSetCreateModal={setCreateModal}></CreatePanel>} */}
        </>
    );
};
export default PanelHeader;
