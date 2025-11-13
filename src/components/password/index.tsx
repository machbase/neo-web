import { useEffect, useState } from 'react';
import { Modal, PasswordInput, Alert } from '@/design-system/components';
import { RiLockPasswordLine } from 'react-icons/ri';
import { getUserName } from '@/utils';
import { changePwd, getLogin } from '@/api/repository/login';
import { checkPwdPolicy, parsePwd } from './utils';

interface PasswordProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PasswordModal = ({ isOpen, onClose }: PasswordProps) => {
    const [sCurrentUserName, setCurUserName] = useState<string>('');
    const [sNewPassword, setNewPassword] = useState<string>('');
    const [sConfirmPassword, setConfirmPassword] = useState<string>('');
    const [sPwdDiff, setPwdDiff] = useState<string | undefined>(undefined);
    const [sRes, setRes] = useState<any>(undefined);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);

    const handleChange = async () => {
        const sPolicyRes = checkPwdPolicy(sNewPassword, sConfirmPassword);
        if (sPolicyRes) return setPwdDiff(sPolicyRes);
        else setPwdDiff(undefined);

        setIsLoading(true);
        const sParsedNewPwd = parsePwd(sNewPassword);
        const sPwdRes = await changePwd(sCurrentUserName, sParsedNewPwd);
        const sParsedRes = sPwdRes?.data ? sPwdRes.data : sPwdRes;
        setRes(sParsedRes);
        setIsLoading(false);

        if (sParsedRes.success) {
            setTimeout(() => {
                onClose();
            }, 1000);
        }
    };

    const init = async () => {
        const sChcekRes: any = await getLogin();
        if (sChcekRes.success) setCurUserName(getUserName()?.toUpperCase());
        else setCurUserName('');
    };

    useEffect(() => {
        init();
    }, []);

    const handleClose = () => {
        if (!sIsLoading) {
            onClose();
        }
    };

    const handleEnter = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !sIsLoading) {
            handleChange();
        }
    };

    return (
        <Modal.Root isOpen={isOpen} onClose={handleClose} closeOnEscape={!sIsLoading} closeOnOutsideClick={!sIsLoading}>
            <Modal.Header>
                <Modal.Title>
                    <RiLockPasswordLine />
                    <span> Change password</span>
                </Modal.Title>
                {!sIsLoading && <Modal.Close />}
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* User Info */}
                    {/* <span>User: {sCurrentUserName}</span> */}
                    {/* New Password */}
                    <PasswordInput
                        label="New password"
                        labelPosition="left"
                        value={sNewPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={handleEnter}
                        autoFocus
                    />
                    {/* Confirm Password */}
                    <PasswordInput
                        label="Confirm password"
                        labelPosition="left"
                        value={sConfirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={handleEnter}
                    />
                    {/* Error Messages */}
                    {sPwdDiff && <Alert variant="error" message={sPwdDiff} />}
                    {sRes && <Alert variant={sRes.success ? 'success' : 'error'} message={sRes.reason} />}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={handleChange} disabled={sIsLoading} loading={sIsLoading}>
                    Apply
                </Modal.Confirm>
                <Modal.Cancel onClick={onClose}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
