import Panel from '../panels/Panel';
import './CreatePanelBody.scss';
const CreatePanelBody = ({ pType, pValue, pIsDrag }: any) => {
    return <div className="chart-body">{pValue && <Panel pValue={pValue} pIsDrag={pIsDrag} pType={pType}></Panel>}</div>;
};
export default CreatePanelBody;
