import { getTableList } from '@/api/repository/api';
import { Refresh, TbEyeMinus } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useState } from 'react';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import TableInfo from './TableInfo';

const DBExplorer = ({ pServer }: any) => {
    const [sDBList, setDBList] = useState<any>([]);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sShowHiddenObj, setShowHiddenObj] = useState(true);

    const init = async (aEvent?: any) => {
        if (aEvent) aEvent.stopPropagation();
        const sData = await getTableList();
        setDBList(
            sData.data.rows.map((aItem: (string | number)[]) => {
                return { info: aItem, child: [] };
            })
        );
    };

    const setHiddenObj = (aEvent: any) => {
        aEvent.stopPropagation();

        setShowHiddenObj(!sShowHiddenObj);
    };

    useEffect(() => {
        init();
    }, []);

    return (
        <div className="side-form">
            <div className="side-title">
                <span>machbase-neo {pServer && pServer.version}</span>
            </div>
            <div className="side-sub-title editors-title" onClick={() => setCollapseTree(!sCollapseTree)}>
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown></VscChevronDown> : <VscChevronRight></VscChevronRight>}</div>

                <div className="files-open-option">
                    <span className="title-text">DB EXPLORER</span>
                    <span className="sub-title-navi">
                        <IconButton pWidth={24} pHeight={13} pIcon={<Refresh />} onClick={(aEvent: any) => init(aEvent)}></IconButton>

                        <IconButton pWidth={24} pHeight={13} pIsActive={!sShowHiddenObj} pIcon={<TbEyeMinus />} onClick={setHiddenObj}></IconButton>
                    </span>
                </div>
            </div>
            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sCollapseTree &&
                    sDBList &&
                    sDBList.length !== 0 &&
                    sDBList.map((aTable: any, aIdx: number) => {
                        return <TableInfo pShowHiddenObj={sShowHiddenObj} key={aIdx} pValue={aTable} pDBList={sDBList} pSetDBList={setDBList}></TableInfo>;
                    })}
            </div>
        </div>
    );
};
export default DBExplorer;
