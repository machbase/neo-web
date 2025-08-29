import useEsc from '@/hooks/useEsc';
import { Modal } from '@/components/modal/Modal';
import { TableHeader } from '@/assets/icons/Icon';
import { Close } from '@/assets/icons/Icon';
import { useRef, useState, useEffect } from 'react';
import { getStatzConfig, setStatzConfig } from '@/api/repository/statz';
import { Error } from '@/components/toast/Toast';
import './StatzTableModal.scss';

export const StatzTableModal = ({ setIsOpen }: { setIsOpen: (aState: boolean) => void }) => {
    const [sTableName, setTableName] = useState<string>('');
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const sRef = useRef(null);
    const sApplyBtnRef = useRef(null);

    const handleApply = async () => {
        setIsLoading(true);
        try {
            const result: any = await setStatzConfig(sTableName);
            if (result && result.success) {
                setIsOpen(false);
            } else {
                Error('Failed to set statz config');
            }
        } catch (error) {
            Error('Error setting statz config');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCurrentConfig = async () => {
        try {
            const result: any = await getStatzConfig();
            if (result && result.success && result.data && result.data.out) {
                setTableName(result.data.out);
            }
        } catch (error) {
            Error('Error loading statz config');
        }
    };

    useEffect(() => {
        loadCurrentConfig();
    }, []);

    const handleTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTableName(e.target.value);
    };

    const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.which === 13 || e.keyCode === 13) {
            e.preventDefault();
            if (sApplyBtnRef.current) {
                (sApplyBtnRef.current as HTMLElement).focus();
            }
        }
    };

    useEsc(() => setIsOpen && setIsOpen(false));

    return (
        <div className="statz-table-wrapper">
            <div ref={sRef} style={{ display: 'flex' }}>
                <Modal pIsDarkMode className="statz-table-modal" onOutSideClose={() => setIsOpen(false)}>
                    <Modal.Header>
                        <div className="statz-table-modal-header">
                            <div className="title">
                                <TableHeader />
                                <span className="text">Statz Table</span>
                            </div>
                            <Close style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)} />
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="statz-table-modal-body">
                            <div className="content">
                                <div className="title">Table name:</div>
                                <div className="item-wrapper">
                                    <input
                                        autoFocus={true}
                                        onChange={handleTableNameChange}
                                        type="text"
                                        style={{ imeMode: 'inactive' }}
                                        tabIndex={1}
                                        onKeyDown={handleEnter}
                                        placeholder="Enter table name"
                                        value={sTableName}
                                    />
                                </div>
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <div ref={sApplyBtnRef} className="statz-table-modal-footer">
                            <button onClick={handleApply} disabled={sIsLoading}>
                                {sIsLoading ? 'Applying...' : 'Apply'}
                            </button>
                        </div>
                    </Modal.Footer>
                </Modal>
            </div>
        </div>
    );
};