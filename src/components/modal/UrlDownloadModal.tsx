import { useRecoilValue } from 'recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import './UrlDownloadModal.scss';
import { postFileList } from '@/api/repository/api';
import { getFileNameAndExtension } from '@/utils/fileNameUtils';
import { RASTER_IMAGE_EXTENSIONS, SERVER_FILE_EXTENSIONS, nameFromUrl } from '@/utils/fileName';
import { resolveOverwrite, savedNameOf } from '@/utils/fileExistence';
import { useOverwritePrompt } from '@/components/modal/useOverwritePrompt';
import { getFileRequestFailure } from '@/utils/fileRequestResult';

const JSON_BODY_EXTENSIONS = ['json', 'wrk', 'taz', 'dsh', 'ipynb'];

// How a downloaded body is read, by extension (r18): JSON documents as before, raster images as bytes, everything
// else (sql, md, markdown, py, sh, html, htm, css, js, mjs, svg, ...) as text.
export const readDownloadBody = async (aRes: { json: () => Promise<any>; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> }, aExtension: string) => {
    const sExt = aExtension.toLowerCase();
    if (JSON_BODY_EXTENSIONS.includes(sExt)) return aRes.json();
    if (RASTER_IMAGE_EXTENSIONS.includes(sExt)) return aRes.arrayBuffer();
    return aRes.text();
};

export interface FolderModalProps {
    setIsOpen: any;
    pCallback: () => void;
}

export const UrlDownloadModal = (props: FolderModalProps) => {
    const { setIsOpen, pCallback } = props;
    const [sDownloadUrl, setDownloadUrl] = useState<string>('');
    const sRecentDirectory = useRecoilValue(gRecentDirectory);
    const [sFolderPath, setFolderPath] = useState<string>('');
    const [sIsLoad, setIsLoad] = useState<boolean>(false);
    const sInputRef = useRef<HTMLInputElement>(null);
    const [sNameError, setNameError] = useState<string | undefined>(undefined);
    const { ask: askOverwrite, prompt: sOverwritePrompt } = useOverwritePrompt();
    // const [sValResult, setValResut] = useState<boolean>(true);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleSave = async () => {
        if (!sFolderPath) return;
        if (!sDownloadUrl) return;
        // one URL->name function: decoded once (the files API builder encodes it again exactly once),
        // name rule incl. supported extension checked inside
        // r17: the extensions the server stores as files (not the editor FileType) — x.py / img.PNG are downloadable,
        // x.pdf (the server would make a folder of it) is not
        const sFile = nameFromUrl(sDownloadUrl, { kind: 'file', extensions: SERVER_FILE_EXTENSIONS });
        if (!sFile.ok) {
            setNameError(`* ${sFile.reason}`);
            return;
        }
        const { extension } = getFileNameAndExtension(sFile.name);
        setNameError(undefined);
        setIsLoad(() => true);
        // shared check (same as every save/create dialog): unfiltered re-query, case-insensitive name, ConfirmModal
        const sDecision = await resolveOverwrite(sRecentDirectory as string, sFile.name, askOverwrite);
        if (sDecision.status === 'folder' || sDecision.status === 'failed') {
            setNameError(`* ${sDecision.reason}`);
            setIsLoad(() => false);
            return;
        }
        if (sDecision.status === 'cancel') {
            setIsLoad(() => false);
            return;
        }
        // r13: an overwrite writes the existing file under its real name
        let sDownloadRes: Response;
        let sPayload: any = undefined;
        try {
            sDownloadRes = await fetch(sDownloadUrl);
            // body kind by extension (readDownloadBody). The old `default: json()` threw on .py/.sh/.htm/.mjs/.html/
            // .css/.js and on images, and the loading state never ended.
            if (sDownloadRes.status === 200) sPayload = await readDownloadBody(sDownloadRes, extension);
        } catch (aErr: any) {
            setNameError(`* Failed to download '${sFile.name}'. ${aErr?.message ?? ''}`.trim());
            setIsLoad(() => false);
            return;
        }

        if (sDownloadRes.status !== 200) {
            // r18: a failed download used to end silently (no error, nothing saved)
            setNameError(`* Failed to download '${sFile.name}' (HTTP ${sDownloadRes.status}).`);
            setIsLoad(() => false);
            return;
        }
        const sResult: any = await postFileList(sPayload, sRecentDirectory, savedNameOf(sDecision, sFile.name));
        // an image URL makes the interceptor ask for responseType 'arraybuffer' (POST too), so a successful image
        // upload answers with an ArrayBuffer, not {success:true} — judge with the shared helper
        const sFailure = getFileRequestFailure(sResult, 'Failed to save the downloaded file.');
        setIsLoad(() => false);
        if (sFailure) {
            setNameError(`* ${sFailure.reason}`);
            return;
        }
        pCallback();
        handleClose();
    };

    const pathHandler = (e: any) => {
        setNameError(undefined);
        setDownloadUrl(e.target.value);
    };

    useEffect(() => {
        if (sInputRef && sInputRef.current) {
            sInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (setIsOpen) {
            setFolderPath(sRecentDirectory as string);
        }
    }, [setIsOpen]);

    return (
        <div className="urldownloadModal">
            <Modal pIsDarkMode onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <span>Url Download</span>
                        </div>
                        <Close onClick={handleClose} />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className={`url-download-body`}>
                        <div className={`url-download-body-header`}>{sFolderPath}</div>
                        <div className={`url-download-body-content`}>
                            <div className={`url-download-body-content-name`}>
                                <div className={`url-download-body-content-name-wrap`}>
                                    <span>Url</span>
                                </div>
                                <div className={`input-wrapper input-wrapper-dark`}>
                                    <input ref={sInputRef} onChange={pathHandler} value={sDownloadUrl} />
                                </div>
                                {sNameError ? <div data-testid="url-download-error">{sNameError}</div> : null}
                                {/* {sValResult ? null : (
                                    <div className={`folder-${pIsDarkMode ? 'dark-' : ''}val-result-false`}> {`* Please check ${pIsGit ? 'url,' : ''} name and path.`}</div>
                                )} */}
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton pText="OK" pBackgroundColor="#4199ff" pIsDisabled={!sDownloadUrl || sIsLoad} onClick={handleSave} />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" pIsDisabled={sIsLoad} onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
            {/* outside the legacy Modal: its overlay onClick would see the portaled ConfirmModal click as an outside click */}
            {sOverwritePrompt}
        </div>
    );
};
