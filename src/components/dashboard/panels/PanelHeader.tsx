import { Delete } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import { useState } from 'react';
import './PanelHeader.scss';

const PanelHeader = ({ pType, pPanelInfo }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sMouseDown, setMouseDown] = useState(false);

    const [sSelectedTab] = useRecoilState(gSelectedTab);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem) => {
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
        <div
            onMouseDown={() => setMouseDown(true)}
            onMouseUp={() => setMouseDown(false)}
            style={
                pType !== 'create'
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
            <div>CHART TITLE</div>
            {pType !== 'create' && <span className="delete">{<IconButton pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />}</span>}
        </div>
    );
};
export default PanelHeader;
