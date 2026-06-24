import { Modal } from '@/design-system/components';
import { stripVPrefix } from '@/utils/version/utils';

export type ConfirmableCommand = 'install' | 'update' | 'uninstall';

const CONFIRM_COPY: Record<ConfirmableCommand, { title: string; verb: string; cta: string }> = {
    install: { title: 'Install package', verb: 'install', cta: 'Install' },
    update: { title: 'Update package', verb: 'update', cta: 'Update' },
    uninstall: { title: 'Uninstall package', verb: 'uninstall', cta: 'Uninstall' },
};

type Props = {
    pendingCmd: ConfirmableCommand | null;
    pkgName: string;
    /** Target version for install/update — shown in the prompt. */
    version?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export const ConfirmCommandModal = ({ pendingCmd, pkgName, version, onConfirm, onCancel }: Props) => {
    if (!pendingCmd) return null;
    const copy = CONFIRM_COPY[pendingCmd];
    return (
        <Modal.Root
            isOpen={true}
            onClose={onCancel}
            size="fit"
            style={{ minWidth: '320px', width: '360px', maxWidth: '90vw', height: 'auto', maxHeight: 'none' }}
        >
            <Modal.Header>
                <Modal.Title>{copy.title}</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <div onClick={(e) => e.stopPropagation()} style={{ fontSize: '13px', lineHeight: 1.5 }}>
                        Are you sure you want to {copy.verb} <strong>{pkgName}</strong>
                        {version ? (
                            <>
                                {' '}at <strong>v{stripVPrefix(version)}</strong>
                            </>
                        ) : null}
                        ?
                        <br />
                        This may take some time to complete.
                    </div>
                </Modal.Content>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={onCancel} />
                <Modal.Confirm onClick={onConfirm} autoFocus>
                    {copy.cta}
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
};
