import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pType, pPanelInfo, pIsDrag, pBoardInfo }: any) => {
    return <div className="chart-body">{pPanelInfo && <Panel pBoardInfo={pBoardInfo} pPanelInfo={pPanelInfo} pIsDrag={pIsDrag} pType={pType}></Panel>}</div>;
};
export default CreatePanelBody;
