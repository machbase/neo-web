import { getTableList } from '@/api/repository/api';
import { TbEyeMinus, MdRefresh } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { useEffect, useState } from 'react';
import { VscChevronDown, VscChevronRight } from '@/assets/icons/Icon';
import TableInfo from './TableInfo';
import { getUserName } from '@/utils';

const DBExplorer = ({ pServer }: any) => {
    const [sDBList, setDBList] = useState<any>([]);
    const [sCollapseTree, setCollapseTree] = useState(true);
    const [sShowHiddenObj, setShowHiddenObj] = useState(true);
    const [sRefresh, setRefresh] = useState<number>(0);

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
        setRefresh(sRefresh + 1);
        const sData = await getTableList();
        const U_NAME = getUserName();
        const DB_NAME_LIST: string[] = Array.from(
            new Set(U_NAME === 'sys' ? ['MACHBASEDB', ...sData.data.rows.map((aRow: any) => aRow[0])] : sData.data.rows.map((aRow: any) => aRow[0]))
        );
        const USER_NAME_LIST: string[] = Array.from(
            new Set(U_NAME === 'sys' ? ['SYS', ...sData.data.rows.map((aRow: any) => aRow[1])] : sData.data.rows.map((aRow: any) => aRow[1]))
        );
        // DB > USER > TABLE > TYPE
        let DB_LIST: any = [];
        DB_NAME_LIST
            ? (DB_LIST = DB_NAME_LIST.map((aName: string) => {
                  return {
                      dbName: aName,
                      userList: USER_NAME_LIST.map((aUser: string) => {
                          return { userName: aUser, total: 0, tableList: { log: [], fixed: [], volatile: [], lookup: [], keyValue: [], tag: [] } };
                      }),
                      tableLen: 0,
                  };
              }))
            : null;
        sData.data.rows.map((bRow: any) => {
            DB_LIST.map((aDB: any, aIdx: number) => {
                if (aDB.dbName === bRow[0]) {
                    DB_LIST[aIdx].tableLen++;
                    USER_NAME_LIST.map((aUser: string, bIdx: number) => {
                        if (bRow[1] === aUser) {
                            DB_LIST[aIdx]['userList'][bIdx].total++;
                            DB_LIST[aIdx]['userList'][bIdx].tableList[TableTypeConverter(bRow[4])].push(bRow);
                        }
                    });
                }
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
                        return <TableInfo pShowHiddenObj={sShowHiddenObj} key={aIdx} pValue={aDB} pDBList={sDBList} pSetDBList={setDBList} pRefresh={sRefresh} />;
                    })}
            </div>
        </div>
    );
};
export default DBExplorer;
