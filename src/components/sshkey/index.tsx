import { ExtensionTab } from '@/components/extension/ExtensionTab';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../modal/ConfirmModal';
import { IconButton } from '../buttons/IconButton';
import { LuFlipVertical } from 'react-icons/lu';
import { EXEC_SSH_KEY, GEN_SSH_KEY, INFO_SSH_KEY, USE_SSH_KEY } from './contents';
import { SSHKEY_ITEM_TYPE, addSSHKey, delSSHKey, getSSHKeys } from '@/api/repository/sshKey';
import { VscKey } from 'react-icons/vsc';

export const SSHKey = () => {
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [sGroupWidth, setGroupWidth] = useState<number[]>([50, 50]);
    const [sAddSSHKeyInfo, setAddSSHKeyInfo] = useState<string>('');
    const [sAddSSHKeyState, setAddSSHKeyState] = useState<boolean>(false);
    const [sSSHKeyList, setSSHKeyList] = useState<SSHKEY_ITEM_TYPE[] | []>([]);
    const [sDeleteSSHKey, setDeleteSSHKey] = useState<SSHKEY_ITEM_TYPE | undefined>(undefined);
    const [sAddState, setAddState] = useState<string | undefined>(undefined);
    const [sDeleteState, setDeleteState] = useState<string | undefined>(undefined);
    const [sAlias, setAlias] = useState<string>('');

    /** Get ssh key list */
    const getSSHKeyList = async () => {
        const sResSSHKeyList = await getSSHKeys();
        if (sResSSHKeyList.success)
            setSSHKeyList(sResSSHKeyList.data && sResSSHKeyList.data?.length > 0 ? sResSSHKeyList.data.sort((a, b) => a.comment.localeCompare(b.comment)) : []);
        else setSSHKeyList([]);
    };
    /** Gen ssh key */
    const genSSHKey = async () => {
        if (sAddSSHKeyInfo.replace(/ +/g, '').length <= 0) return;
        if (sAlias.length <= 0) return;
        setAddState(undefined);
        const sSplitKeyInfo = sAddSSHKeyInfo.replace(/ +/g, ' ').split(' ');
        const sParsedKeyInfo: string = `${sSplitKeyInfo[0]} ${sSplitKeyInfo[1]} ${sAlias}`;
        const sRes: any = await addSSHKey(sParsedKeyInfo);
        if (sRes?.success) {
            getSSHKeyList();
            setAddState(undefined);
            setAddSSHKeyState(false);
        } else setAddState(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
    };
    /** Del ssh key */
    const deleteKey = async () => {
        const sRes: any = await delSSHKey(sDeleteSSHKey?.fingerprint as string);
        if (sRes.success) {
            getSSHKeyList();
            setDeleteState(undefined);
        } else setDeleteState(sRes?.data ? (sRes as any).data.reason : (sRes.statusText as string));
        setIsDeleteModal(false);
    };
    /** Open confirm modal */
    const handleDelete = (e: React.MouseEvent, aTargetInfo: SSHKEY_ITEM_TYPE) => {
        e.stopPropagation();
        setDeleteSSHKey(aTargetInfo);
        setIsDeleteModal(true);
    };
    /** Apply pub key info */
    const handleAddSSHKeyInfo = (e: React.FormEvent<HTMLTextAreaElement>) => {
        setAddSSHKeyInfo((e.target as HTMLTextAreaElement).value);
    };
    /** Open create ssh key form */
    const handleCreate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAddState(undefined);
        setAddSSHKeyInfo('');
        setAlias('');
        setAddSSHKeyState(!sAddSSHKeyState);
    };
    /** Apply ssh key alias */
    const handleAlias = (e: React.FormEvent<HTMLInputElement>) => {
        if ((e.target as HTMLInputElement).value.includes(' ')) return;
        setAlias((e.target as HTMLInputElement).value);
    };
    const Resizer = () => {
        return <SashContent className={`security-key-sash-style`} />;
    };

    useEffect(() => {
        getSSHKeyList();
    }, []);

    return (
        <>
            {/* Show info */}
            <ExtensionTab>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    <Pane minSize={400}>
                        <ExtensionTab.Header />
                        <ExtensionTab.Body>
                            <ExtensionTab.ContentBlock>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <ExtensionTab.SubTitle>{INFO_SSH_KEY.title}</ExtensionTab.SubTitle>
                                    {!sAddSSHKeyState && <ExtensionTab.TextButton pText="New SSH key" pWidth="100px" pType="CREATE" pCallback={handleCreate} mr="0px" />}
                                </div>
                                <ExtensionTab.Space pHeight="4px" />
                                <ExtensionTab.Hr />
                            </ExtensionTab.ContentBlock>
                            {sAddSSHKeyState && (
                                <>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.ContentTitle>{INFO_SSH_KEY.cre_alias}</ExtensionTab.ContentTitle>
                                            <ExtensionTab.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </ExtensionTab.ContentDesc>
                                        </ExtensionTab.DpRow>
                                        <ExtensionTab.Input pAutoFocus pValue={sAlias} pWidth="100%" pCallback={(event: React.FormEvent<HTMLInputElement>) => handleAlias(event)} />
                                    </ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentBlock>
                                        <ExtensionTab.DpRow>
                                            <ExtensionTab.ContentTitle>{INFO_SSH_KEY.cre_title}</ExtensionTab.ContentTitle>
                                            <ExtensionTab.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </ExtensionTab.ContentDesc>
                                        </ExtensionTab.DpRow>
                                        <ExtensionTab.TextArea pContent={sAddSSHKeyInfo} pHeight={80} pCallback={handleAddSSHKeyInfo} pPlaceHolder={INFO_SSH_KEY.cre_desc} />
                                        <ExtensionTab.ContentDesc>{INFO_SSH_KEY.cre_support}</ExtensionTab.ContentDesc>
                                        <ExtensionTab.Space pHeight="16px" />
                                        <ExtensionTab.TextButton pText="Add SSH key" pWidth="100px" pType="CREATE" pCallback={genSSHKey} mr="8px" />
                                        <ExtensionTab.TextButton pText="Cancel" pWidth="80px" pType="DELETE" pCallback={() => setAddSSHKeyState(false)} mr="0px" />
                                        {/* AddState */}
                                        {sAddState && (
                                            <ExtensionTab.ContentDesc>
                                                <ExtensionTab.TextResErr pText={sAddState} />
                                            </ExtensionTab.ContentDesc>
                                        )}
                                    </ExtensionTab.ContentBlock>
                                </>
                            )}

                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>{INFO_SSH_KEY.info_title}</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>{INFO_SSH_KEY.info_content}</ExtensionTab.ContentDesc>
                                <ExtensionTab.Space pHeight="12px" />
                                {/* DelState */}
                                {sDeleteState && (
                                    <ExtensionTab.ContentDesc>
                                        <ExtensionTab.TextResErr pText={sDeleteState} />
                                    </ExtensionTab.ContentDesc>
                                )}
                                <div style={{ border: 'solid 1px #f1f1f125', borderRadius: '3px' }}>
                                    {sSSHKeyList &&
                                        sSSHKeyList.map((aSSHKey, aIdx) => {
                                            return (
                                                <div key={aIdx}>
                                                    <ExtensionTab.HoverBg>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '4px 16px',
                                                            }}
                                                        >
                                                            <ExtensionTab.DpRow>
                                                                <div style={{ marginRight: '16px' }}>
                                                                    <VscKey style={{ width: '30px', height: '30px' }} />
                                                                </div>
                                                                <div>
                                                                    <ExtensionTab.ContentText pContent={aSSHKey.comment}></ExtensionTab.ContentText>
                                                                    <ExtensionTab.ContentDesc>{aSSHKey.keyType}</ExtensionTab.ContentDesc>
                                                                    <ExtensionTab.ContentDesc>{aSSHKey.fingerprint}</ExtensionTab.ContentDesc>
                                                                </div>
                                                            </ExtensionTab.DpRow>
                                                            <ExtensionTab.TextButton
                                                                pText="Delete"
                                                                pWidth="60px"
                                                                pType="DELETE"
                                                                pCallback={(e) => handleDelete(e, aSSHKey)}
                                                                mr="0px"
                                                            />
                                                        </div>
                                                    </ExtensionTab.HoverBg>
                                                    <ExtensionTab.Hr />
                                                </div>
                                            );
                                        })}
                                </div>
                            </ExtensionTab.ContentBlock>
                        </ExtensionTab.Body>
                    </Pane>
                    <Pane minSize={400}>
                        <ExtensionTab.Header>
                            <div />
                            <div style={{ display: 'flex' }}>
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Vertical"
                                    pToolTipId="ssh-key-tab-hori"
                                    pIcon={<LuFlipVertical style={{ transform: 'rotate(90deg)' }} />}
                                    pIsActive={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <IconButton
                                    pIsToopTip
                                    pToolTipContent="Horizontal"
                                    pToolTipId="ssh-key-tab-ver"
                                    pIcon={<LuFlipVertical />}
                                    pIsActive={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </div>
                        </ExtensionTab.Header>
                        <ExtensionTab.Body>
                            {/* GEN */}
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>{GEN_SSH_KEY.title}</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>{GEN_SSH_KEY.desc}</ExtensionTab.ContentDesc>
                                {/* GEN step 1 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no1_title}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* GEN step 2 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no2_title}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Space pHeight="12px" />
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no2_desc_2}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock pContent={GEN_SSH_KEY.no2_content_2} />
                                    <ExtensionTab.Space pHeight="12px" />
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no2_desc_1}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock pContent={GEN_SSH_KEY.no2_content_1} />
                                </ExtensionTab.ContentBlock>
                                {/* GEN step 3 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no3_title}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.Space pHeight="12px" />
                                    <ExtensionTab.CopyBlock pContent={GEN_SSH_KEY.no3_content} />
                                </ExtensionTab.ContentBlock>
                                {/* GEN step 4 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no4_title}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                                {/* GEN step 5 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no5_title}</ExtensionTab.ContentDesc>
                                    <ExtensionTab.CopyBlock pContent={GEN_SSH_KEY.no5_content} />
                                </ExtensionTab.ContentBlock>
                                {/* GEN step 6 */}
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.ContentDesc>{GEN_SSH_KEY.no6_title}</ExtensionTab.ContentDesc>
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.ContentBlock>
                            {/* Use */}
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>{USE_SSH_KEY.title}</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>{USE_SSH_KEY.desc}</ExtensionTab.ContentDesc>
                            </ExtensionTab.ContentBlock>
                            {/* Execute */}
                            <ExtensionTab.ContentBlock>
                                <ExtensionTab.ContentTitle>{EXEC_SSH_KEY.title}</ExtensionTab.ContentTitle>
                                <ExtensionTab.ContentDesc>{EXEC_SSH_KEY.desc}</ExtensionTab.ContentDesc>
                                <ExtensionTab.ContentBlock>
                                    <ExtensionTab.CopyBlock pContent={EXEC_SSH_KEY.content} />
                                    <ExtensionTab.Space pHeight="8px" />
                                    <ExtensionTab.Hr />
                                    <ExtensionTab.Space pHeight="12px" />
                                    <ExtensionTab.Table pList={{ columns: EXEC_SSH_KEY.table.columns, rows: EXEC_SSH_KEY.table.rows }} />
                                </ExtensionTab.ContentBlock>
                            </ExtensionTab.ContentBlock>
                        </ExtensionTab.Body>
                    </Pane>
                </SplitPane>
            </ExtensionTab>
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={deleteKey}
                    pContents={
                        <div className="body-content">
                            <span>{sDeleteSSHKey?.comment}</span>
                            <span>({sDeleteSSHKey?.fingerprint})</span>
                            <span>{`Do you want to delete this SSH Key?`}</span>
                        </div>
                    }
                />
            )}
        </>
    );
};
