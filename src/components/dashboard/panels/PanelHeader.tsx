import { Delete } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { gBoardList, GBoardListType, gSelectedTab } from '@/recoil/recoil';
import { useRecoilState } from 'recoil';
import './PanelHeader.scss';

const PanelHeader = ({ pValue, pDraging }: any) => {
    const [sBoardList, setBoardList] = useRecoilState<GBoardListType[]>(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);

    const removePanel = () => {
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab
                    ? {
                          ...aItem,
                          panels: aItem.panels.filter((aItem: any) => aItem.i !== pValue.i),
                      }
                    : aItem;
            })
        );
    };

    return (
        <div
            style={
                pDraging
                    ? {
                          cursor: 'grab',
                      }
                    : {
                          cursor: 'grabbing',
                      }
            }
            className="board-panel-header"
        >
            <div>CHART TITLE</div>
            <span className="delete">{<IconButton pWidth={25} pIcon={<Delete size={18} />} onClick={() => removePanel()} />}</span>
        </div>
    );
};
export default PanelHeader;
