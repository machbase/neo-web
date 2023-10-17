import LineChart from './chart/LineChart';
import PanelHeader from './PanelHeader';
import './Panel.scss';
const Panel = ({ pBoardInfo, pShowEditPanel, pType, pPanelInfo }: any) => {
    return (
        <div className="panel-wrap">
            <PanelHeader pShowEditPanel={pShowEditPanel} pType={pType} pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo}></PanelHeader>
            {pPanelInfo && <LineChart pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo}></LineChart>}
        </div>
    );
};
export default Panel;
