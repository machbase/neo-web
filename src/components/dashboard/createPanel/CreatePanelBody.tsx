import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pType, pPanelInfo, pBoardInfo, pInsetDraging }: any) => {
    return <div className="chart-body">{pPanelInfo && <Panel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pInsetDraging={pInsetDraging} pType={pType}></Panel>}</div>;
};
export default CreatePanelBody;
