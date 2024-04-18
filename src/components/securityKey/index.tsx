import { KeyItemType, delKey, getKeyList } from '@/api/repository/key';
import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { CreateKey } from '@/components/securityKey/createKey';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gActiveKey, gBoardList, gKeyList } from '@/recoil/recoil';
import { Delete } from '@/assets/icons/Icon';
import { IconButton } from '../buttons/IconButton';
import { changeUtcToText } from '@/utils/helpers/date';
import SplitPane from 'split-pane-react/esm/SplitPane';
import { Pane, SashContent } from 'split-pane-react';

export const SecurityKey = ({ pCode }: { pCode: KeyItemType }) => {
    const [sSecurityKeyList, setSecurityKeyList] = useRecoilState<KeyItemType[] | undefined>(gKeyList);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const setActiveKeyName = useSetRecoilState<any>(gActiveKey);

    /** delete key */
    const deleteKey = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Do You Really Want To Delete This Key?')) {
            const sRes = await delKey(pCode.id);
            if (sRes.success) {
                const sKeyList = await getKeyList();
                if (sKeyList.success) setSecurityKeyList(sKeyList.list);
                else setSecurityKeyList(undefined);

                const sTempKeyList = sSecurityKeyList?.filter((aKeyInfo) => aKeyInfo.id !== pCode.id);
                if (sTempKeyList && sTempKeyList.length > 0) {
                    setActiveKeyName(sTempKeyList[0].id);
                    const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'key');
                    setBoardList((aBoardList: any) => {
                        return aBoardList.map((aBoard: any) => {
                            if (aBoard.id === aTarget.id) {
                                return {
                                    ...aTarget,
                                    name: `KEY: ${sTempKeyList[0].id}`,
                                    code: sTempKeyList[0],
                                    savedCode: true,
                                };
                            }
                            return aBoard;
                        });
                    });
                } else {
                    const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'key');
                    setActiveKeyName('');
                    setBoardList((aBoardList: any) => {
                        return aBoardList.map((aBoard: any) => {
                            if (aBoard.id === aTarget.id) {
                                return {
                                    ...aTarget,
                                    name: `KEY: create`,
                                    code: undefined,
                                    savedCode: true,
                                };
                            }
                            return aBoard;
                        });
                    });
                }
            }
        } else {
            alert('Delete Has Been Canceled.');
        }
    };
    /** return local time */
    const getTime = (aTime: number): string => {
        const sUtcText = changeUtcToText(aTime);
        return sUtcText;
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style security-key-sash-style-none`} />;
    };

    return (
        <>
            {/* Show info */}
            {pCode && (
                <ExtensionTab>
                    <SplitPane sashRender={() => Resizer()} split={'vertical'} sizes={['50', '50']} onChange={() => {}}>
                        <Pane minSize={400}>
                            <ExtensionTab.Header>
                                <div />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent={'Delete'}
                                    pToolTipId={'shell-key-download' + '-block-math'}
                                    pWidth={25}
                                    pHeight={25}
                                    pIcon={<Delete />}
                                    onClick={deleteKey}
                                />
                            </ExtensionTab.Header>
                            <ExtensionTab.Body>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Client id</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{pCode.id}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Valid from</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{getTime(pCode.notBefore)}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentTitle>Expire</ExtensionTab.ContentTitle>
                                    <ExtensionTab.ContentDesc>{getTime(pCode.notAfter)}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.Body>
                        </Pane>
                        <Pane minSize={400}>
                            <ExtensionTab.Header>
                                <></>
                            </ExtensionTab.Header>
                        </Pane>
                    </SplitPane>
                </ExtensionTab>
            )}
            {/* Show create */}
            {!pCode && <CreateKey />}
        </>
    );
};
