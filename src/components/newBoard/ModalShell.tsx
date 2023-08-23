import { postShell } from '@/api/repository/api';
import { useState } from 'react';
import { useEffect } from 'react';
import './ModalShell.scss';
import icons from '@/utils/icons';
import { Close } from '@/assets/icons/Icon';
import { Success, Error } from '@/components/toast/Toast';

const ModalShell = ({ pGetInfo, pSetIsModal, pInfo }: any) => {
    const [sName, setName] = useState('');
    const [sCommand, setCommand] = useState('');
    const [sTheme, setTheme] = useState('');
    const [sIcon, setIcon] = useState('');

    const sIconList = ['console-network-outline', 'monitor-small', 'console-line', 'powershell', 'laptop', 'database', 'database-outline'];

    const sThemeList = ['default', 'white', 'dark', 'gray', 'galaxy'];

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
            Success('Success');
            pGetInfo();
            pSetIsModal(false);
        } else {
            Error('Failed');
        }
    };

    return (
        <div>
            <div onClick={() => pSetIsModal(false)} className="edit-shell-modal-cover"></div>
            <div className="edit-shell-modal">
                <div className="edit-shell-header">
                    <div>Edit {pInfo.label}</div>
                    <div>
                        <Close onClick={() => pSetIsModal(false)} color="#f8f8f8"></Close>
                    </div>
                </div>
                <div className="edit-shell-info">
                    <div className="edit-shell-name">
                        <span>Name</span>
                        <input value={sName} onChange={handleName} type="text" />
                    </div>
                    <div className="edit-shell-command">
                        <span>Command</span>
                        <input value={sCommand} onChange={handleCommand} type="text" />
                    </div>
                    <div className="edit-shell-theme">
                        <span>Theme</span>
                        {sTheme && (
                            <select defaultValue={sTheme} onChange={handleTheme}>
                                {sThemeList.map((aItem: any, aIdx: number) => {
                                    return (
                                        <option key={aIdx} value={aItem}>
                                            {aItem}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
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
                    <button className="ok-btn" onClick={() => save()}>
                        Save
                    </button>
                    <button className="cancel-btn" onClick={() => pSetIsModal(false)}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalShell;
