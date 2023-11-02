import { getTableList } from '@/api/repository/api';
import { TbEyeMinus, MdRefresh } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useState } from 'react';
import { VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import TableInfo from './TableInfo';

const DBExplorer = ({ pServer }: any) => {
    const [sDBList, setDBList] = useState<any>([]);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sShowHiddenObj, setShowHiddenObj] = useState(true);

    const TableTypeConverter = (aType: number): string => {
        switch (aType) {
            case 0:
                return 'log';
            case 1:
                return 'fixed';
            case 3:
                return 'volatile';
            case 4:
                return 'lookup';
            case 5:
                return 'keyValue';
            case 6:
                return 'tag';
            default:
                return '';
        }
    };

    const init = async (aEvent?: any) => {
        setDBList([]);
        if (aEvent) aEvent.stopPropagation();
        const sData = await getTableList();
        const DB_NAME_LIST: string[] = Array.from(new Set(sData.data.rows.map((aRow: any) => aRow[0])));
        if (DB_NAME_LIST.length > 0 && DB_NAME_LIST.includes('MACHBASEDB')) DB_NAME_LIST.unshift(...DB_NAME_LIST.splice(DB_NAME_LIST.indexOf('MACHBASEDB'), 1));
        let DB_LIST: any = [];
        DB_NAME_LIST
            ? (DB_LIST = DB_NAME_LIST.map((aName: string) => {
                  return {
                      dbName: aName,
                      tableList: { log: [], fixed: [], volatile: [], lookup: [], keyValue: [], tag: [] },
                  };
              }))
            : null;
        sData.data.rows.map((bRow: any) => {
            DB_LIST.map((aDB: any, aIdx: number) => {
                if (aDB.dbName === bRow[0])
                    bRow[1] === 'SYS' ? DB_LIST[aIdx].tableList[TableTypeConverter(bRow[4])].unshift(bRow) : DB_LIST[aIdx].tableList[TableTypeConverter(bRow[4])].push(bRow);
            });
        });
        setDBList(DB_LIST);
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
                <div className="collapse-icon">{sCollapseTree ? <VscChevronDown /> : <VscChevronRight />}</div>
                <div className="files-open-option">
                    <span className="title-text">DB EXPLORER</span>
                    <span className="sub-title-navi">
                        <IconButton pWidth={20} pHeight={20} pIsActive={!sShowHiddenObj} pIcon={<TbEyeMinus size={15} />} onClick={setHiddenObj} />
                        <IconButton pWidth={20} pHeight={20} pIcon={<MdRefresh size={15} />} onClick={(aEvent: any) => init(aEvent)} />
                    </span>
                </div>
            </div>
            <div style={{ overflow: 'auto', height: 'calc(100% - 62px)' }}>
                {sCollapseTree &&
                    sDBList &&
                    sDBList.length !== 0 &&
                    sDBList.map((aDB: any, aIdx: number) => {
                        return <TableInfo pShowHiddenObj={sShowHiddenObj} key={aIdx} pValue={aDB} pDBList={sDBList} pSetDBList={setDBList} />;
                    })}
            </div>
        </div>
    );
};
export default DBExplorer;
