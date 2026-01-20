import { postShell } from '@/api/repository/api';
import { useState } from 'react';
import { useEffect } from 'react';
import './ModalShell.scss';
import icons from '@/utils/icons';
import { Close } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { TextButton } from '@/components/buttons/TextButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';

const ModalShell = ({ pGetInfo, pSetIsModal, pInfo }: any) => {
    const [sName, setName] = useState('');
    const [sCommand, setCommand] = useState('');
    const [sTheme, setTheme] = useState('');
    const [sIcon, setIcon] = useState('');

    const sIconList = ['console-network-outline', 'monitor-small', 'console-line', 'powershell', 'laptop', 'database', 'database-outline'];

    const sThemeList = ['default', 'white', 'dark', 'indigo', 'gray', 'galaxy'];

    useEffect(() => {
        setName(pInfo.label);
        setCommand(pInfo.command);
        setTheme(pInfo.theme ? pInfo.theme : 'default');
        const sIcon = sIconList.find((aItem) => aItem === pInfo.icon);
        setIcon(sIcon ? sIcon : 'monitor');
    }, []);

    const handleName = (aEvent: any) => {
        setName(aEvent.target.value);
    };
    const handleCommand = (aEvent: any) => {
        setCommand(aEvent.target.value);
    };
    const handleTheme = (aEvent: any) => {
        setTheme(aEvent.target.value);
    };
    const handleIcon = (aValue: any) => {
        setIcon(aValue);
    };

    const save = async () => {
        const sData = {
            ...pInfo,
            label: sName,
            command: sCommand,
            icon: sIcon,
            theme: sTheme,
        };
        const sResult: any = await postShell(sData);
        if (sResult.reason) {
            Toast.success('Success');
            pGetInfo();
            pSetIsModal(false);
        } else {
            Toast.error('Failed');
        }
    };

    return (
        <div>
            <div onClick={() => pSetIsModal(false)} className="edit-shell-modal-cover"></div>
            <div className="edit-shell-modal">
                <div className="edit-shell-header">
                    <div>{pInfo.label}</div>
                    <div>
                        <Close onClick={() => pSetIsModal(false)} color="#f8f8f8"></Close>
                    </div>
                </div>
                <div className="edit-shell-info">
                    <div className="edit-shell-name">
                        <span>Name</span>
                        <Input pWidth={210} pHeight={30} pValue={sName} pSetValue={() => null} onChange={handleName} />
                    </div>
                    <div className="edit-shell-command">
                        <span>Command</span>
                        <Input pWidth={210} pHeight={30} pValue={sCommand} pSetValue={() => null} onChange={handleCommand} />
                    </div>
                    <div className="edit-shell-theme">
                        <span>Theme</span>
                        {sTheme && <Select pWidth={210} pHeight={30} pInitValue={sTheme} onChange={handleTheme} pOptions={sThemeList} />}
                    </div>
                    <div className="edit-shell-icon">
                        <span>Icon</span>
                        <div className="icon-list">
                            {sIconList.map((aItem: any, aIdx: number) => {
                                return (
                                    <div className={sIcon === aItem ? 'selected-icons icon' : 'icon'} key={aIdx} onClick={() => handleIcon(aItem)}>
                                        {icons(aItem)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="edit-shell-footer">
                    <TextButton pWidth={100} pHeight={30} pText="Save" pBackgroundColor="#4199ff" onClick={save} />
                    <TextButton pWidth={100} pHeight={30} pText="Cancel" pBackgroundColor="#666979" onClick={() => pSetIsModal(false)} />
                </div>
            </div>
        </div>
    );
};

export default ModalShell;
