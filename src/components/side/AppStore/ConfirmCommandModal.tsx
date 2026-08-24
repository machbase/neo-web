import { Modal } from '@/design-system/components';
import { stripVPrefix } from '@/utils/version/utils';

export type ConfirmableCommand = 'install' | 'update' | 'uninstall' | 'removeDirectory';

const CONFIRM_COPY: Record<ConfirmableCommand, { title: string; verb: string; cta: string }> = {
    install: { title: 'Install package', verb: 'install', cta: 'Install' },
    update: { title: 'Update package', verb: 'update', cta: 'Update' },
    uninstall: { title: 'Uninstall package', verb: 'uninstall', cta: 'Uninstall' },
    // issue #1452 — NOT an uninstall, and worded so it cannot be mistaken for one:
    // this deletes a directory and runs no package script. See `strayRemove.ts`.
    removeDirectory: { title: 'Remove directory', verb: 'remove', cta: 'Remove' },
};

type Props = {
    pendingCmd: ConfirmableCommand | null;
    pkgName: string;
    /** Target version for install/update — shown in the prompt. */
    version?: string;
    /**
     * issue #1452 — the FULL PATH about to be deleted, for `removeDirectory`.
     *
     * Spelled out rather than summarised as a package name, because the whole
     * point of the stray card is that the two disagree: somebody who downloaded a
     * source zip and has been working inside `/public/neo-pkg-foo-main/` can only
     * recognise what they are about to lose by seeing the path. This prompt is the
     * last place that can tell them.
     */
    path?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export const ConfirmCommandModal = ({ pendingCmd, pkgName, version, path, onConfirm, onCancel }: Props) => {
    if (!pendingCmd) return null;
    const copy = CONFIRM_COPY[pendingCmd];
    if (pendingCmd === 'removeDirectory') {
        return (
            <Modal.Root
                isOpen={true}
                onClose={onCancel}
                size="fit"
                style={{ minWidth: '320px', width: '420px', maxWidth: '90vw', height: 'auto', maxHeight: 'none' }}
            >
                <Modal.Header>
                    <Modal.Title>{copy.title}</Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Modal.Content>
                        <div onClick={(e) => e.stopPropagation()} style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            This permanently deletes
                            <div style={{ margin: '6px 0', fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                                <strong>{path ?? ''}</strong>
                            </div>
                            and everything inside it, including any changes made there.
                            <br />
                            No uninstall script runs — this directory was never installed.
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
    }
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
