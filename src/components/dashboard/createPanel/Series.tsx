import { Refresh } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import './Series.scss';
const Series = ({ pTableList, pGetTables }: any) => {
    const changedTable = (sData: any) => {
        console.log(sData);
    };
    const changedText = (sData: any) => {
        console.log(sData);
    };
    return (
        <div className="series">
            <div className="row">
                <div className="series-table">
                    <span className="series-title"> Alias </span>
                    <Input
                        pBorderRadius={4}
                        pWidth={200}
                        pHeight={26}
                        pType="number"
                        pValue={'123'}
                        pSetValue={() => null}
                        onChange={(aEvent: any) => changedText(aEvent.target.value)}
                    />
                </div>
                <div className="series-table">
                    <span className="series-title"> Table </span>
                    <Select pFontSize={12} pWidth={200} pBorderRadius={4} pInitValue={pTableList[0]} pHeight={26} onChange={changedTable} pOptions={pTableList} />
                    <IconButton pWidth={30} pHeight={26} pIcon={<Refresh></Refresh>} onClick={() => pGetTables()}></IconButton>
                </div>
            </div>
        </div>
    );
};
export default Series;
