import { Button, Page } from '@/design-system/components';
import { SplitPane, Pane } from '@/design-system/components';
import { SashContent } from 'split-pane-react';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../modal/ConfirmModal';
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
            <Page>
                <SplitPane sashRender={() => Resizer()} split={isVertical ? 'vertical' : 'horizontal'} sizes={sGroupWidth} onChange={setGroupWidth}>
                    <Pane minSize={400}>
                        <Page.Header />
                        <Page.Body>
                            <Page.ContentBlock>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Page.SubTitle>{INFO_SSH_KEY.title}</Page.SubTitle>
                                    {!sAddSSHKeyState && <Page.TextButton pText="New SSH key" pWidth="100px" pType="CREATE" pCallback={handleCreate} mr="0px" />}
                                </div>
                                <Page.Space pHeight="4px" />
                                <Page.Hr />
                            </Page.ContentBlock>
                            {sAddSSHKeyState && (
                                <>
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>{INFO_SSH_KEY.cre_alias}</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.Input pAutoFocus pValue={sAlias} pWidth="100%" pCallback={(event: React.FormEvent<HTMLInputElement>) => handleAlias(event)} />
                                    </Page.ContentBlock>
                                    <Page.ContentBlock>
                                        <Page.DpRow>
                                            <Page.ContentTitle>{INFO_SSH_KEY.cre_title}</Page.ContentTitle>
                                            <Page.ContentDesc>
                                                <span style={{ marginLeft: '4px', color: '#f35b5b' }}>*</span>
                                            </Page.ContentDesc>
                                        </Page.DpRow>
                                        <Page.TextArea pContent={sAddSSHKeyInfo} pHeight={80} pCallback={handleAddSSHKeyInfo} pPlaceHolder={INFO_SSH_KEY.cre_desc} />
                                        <Page.ContentDesc>{INFO_SSH_KEY.cre_support}</Page.ContentDesc>
                                        <Page.Space pHeight="16px" />
                                        <Page.TextButton pText="Add SSH key" pWidth="100px" pType="CREATE" pCallback={genSSHKey} mr="8px" />
                                        <Page.TextButton pText="Cancel" pWidth="80px" pType="DELETE" pCallback={() => setAddSSHKeyState(false)} mr="0px" />
                                        {/* AddState */}
                                        {sAddState && (
                                            <Page.ContentDesc>
                                                <Page.TextResErr pText={sAddState} />
                                            </Page.ContentDesc>
                                        )}
                                    </Page.ContentBlock>
                                </>
                            )}

                            <Page.ContentBlock>
                                <Page.ContentTitle>{INFO_SSH_KEY.info_title}</Page.ContentTitle>
                                <Page.ContentDesc>{INFO_SSH_KEY.info_content}</Page.ContentDesc>
                                <Page.Space pHeight="12px" />
                                {/* DelState */}
                                {sDeleteState && (
                                    <Page.ContentDesc>
                                        <Page.TextResErr pText={sDeleteState} />
                                    </Page.ContentDesc>
                                )}
                                <div style={{ border: 'solid 1px #f1f1f125', borderRadius: '3px' }}>
                                    {sSSHKeyList &&
                                        sSSHKeyList.map((aSSHKey, aIdx) => {
                                            return (
                                                <div key={aIdx}>
                                                    <Page.HoverBg>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'row',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '4px 16px',
                                                            }}
                                                        >
                                                            <Page.DpRow>
                                                                <div style={{ marginRight: '16px' }}>
                                                                    <VscKey style={{ width: '30px', height: '30px' }} />
                                                                </div>
                                                                <div>
                                                                    <Page.ContentText pContent={aSSHKey.comment}></Page.ContentText>
                                                                    <Page.ContentDesc>{aSSHKey.keyType}</Page.ContentDesc>
                                                                    <Page.ContentDesc>{aSSHKey.fingerprint}</Page.ContentDesc>
                                                                </div>
                                                            </Page.DpRow>
                                                            <Page.TextButton pText="Delete" pWidth="60px" pType="DELETE" pCallback={(e) => handleDelete(e, aSSHKey)} mr="0px" />
                                                        </div>
                                                    </Page.HoverBg>
                                                    <Page.Hr />
                                                </div>
                                            );
                                        })}
                                </div>
                            </Page.ContentBlock>
                        </Page.Body>
                    </Pane>
                    <Pane minSize={400}>
                        <Page.Header>
                            <div />
                            <Button.Group>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Vertical"
                                    icon={<LuFlipVertical size={16} style={{ transform: 'rotate(90deg)' }} />}
                                    active={isVertical}
                                    onClick={() => setIsVertical(true)}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    isToolTip
                                    toolTipContent="Horizontal"
                                    icon={<LuFlipVertical size={16} />}
                                    active={!isVertical}
                                    onClick={() => setIsVertical(false)}
                                />
                            </Button.Group>
                        </Page.Header>
                        <Page.Body>
                            {/* GEN */}
                            <Page.ContentBlock pHoverNone>
                                <Page.ContentTitle>{GEN_SSH_KEY.title}</Page.ContentTitle>
                                <Page.ContentDesc>{GEN_SSH_KEY.desc}</Page.ContentDesc>
                                {/* GEN step 1 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no1_title}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* GEN step 2 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no2_title}</Page.ContentDesc>
                                    <Page.Space pHeight="12px" />
                                    <Page.ContentDesc>{GEN_SSH_KEY.no2_desc_2}</Page.ContentDesc>
                                    <Page.CopyBlock pContent={GEN_SSH_KEY.no2_content_2} />
                                    <Page.Space pHeight="12px" />
                                    <Page.ContentDesc>{GEN_SSH_KEY.no2_desc_1}</Page.ContentDesc>
                                    <Page.CopyBlock pContent={GEN_SSH_KEY.no2_content_1} />
                                </Page.ContentBlock>
                                {/* GEN step 3 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no3_title}</Page.ContentDesc>
                                    <Page.Space pHeight="12px" />
                                    <Page.CopyBlock pContent={GEN_SSH_KEY.no3_content} />
                                </Page.ContentBlock>
                                {/* GEN step 4 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no4_title}</Page.ContentDesc>
                                </Page.ContentBlock>
                                {/* GEN step 5 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no5_title}</Page.ContentDesc>
                                    <Page.CopyBlock pContent={GEN_SSH_KEY.no5_content} />
                                </Page.ContentBlock>
                                {/* GEN step 6 */}
                                <Page.ContentBlock>
                                    <Page.ContentDesc>{GEN_SSH_KEY.no6_title}</Page.ContentDesc>
                                </Page.ContentBlock>
                            </Page.ContentBlock>
                            {/* Use */}
                            <Page.ContentBlock>
                                <Page.ContentTitle>{USE_SSH_KEY.title}</Page.ContentTitle>
                                <Page.ContentDesc>{USE_SSH_KEY.desc}</Page.ContentDesc>
                            </Page.ContentBlock>
                            {/* Execute */}
                            <Page.ContentBlock>
                                <Page.ContentTitle>{EXEC_SSH_KEY.title}</Page.ContentTitle>
                                <Page.ContentDesc>{EXEC_SSH_KEY.desc}</Page.ContentDesc>
                                <Page.ContentBlock pHoverNone>
                                    <Page.CopyBlock pContent={EXEC_SSH_KEY.content} />
                                    <Page.Space pHeight="8px" />
                                    <Page.Hr />
                                    <Page.Space pHeight="12px" />
                                    <Page.Table pList={{ columns: EXEC_SSH_KEY.table.columns, rows: EXEC_SSH_KEY.table.rows }} />
                                </Page.ContentBlock>
                            </Page.ContentBlock>
                        </Page.Body>
                    </Pane>
                </SplitPane>
            </Page>
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
