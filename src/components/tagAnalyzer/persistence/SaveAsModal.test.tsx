import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosHeaders } from 'axios';
import { getFiles } from '@/api/repository/fileTree';
import { SaveAsModal } from './SaveAsModal';
import { tazFileApi, type FileListItem } from './tazFileApi';

jest.mock('./tazFileApi', () => ({ tazFileApi: { fetchTazFileList: jest.fn() } }));
jest.mock('@/api/repository/fileTree', () => ({ getFiles: jest.fn() }));
const fetchFiles = jest.mocked(tazFileApi.fetchTazFileList);
const directory: FileListItem = { name: 'reports', type: 'dir', size: 0, lastModifiedUnixMillis: 0 };
const file: FileListItem = { name: 'existing.taz', type: '.taz', size: 10, lastModifiedUnixMillis: 0 };
const emptyDirectoryResponse: Awaited<ReturnType<typeof getFiles>> = {
    status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() },
    data: { name: 'reports', isDir: true, gitClone: false, children: [] },
};

beforeEach(() => {
    fetchFiles.mockReset();
    jest.mocked(getFiles).mockReset().mockResolvedValue(emptyDirectoryResponse);
});
afterEach(() => jest.restoreAllMocks());

test('browses folders and saves the selected file in the displayed directory, with overwrite confirmation', async () => {
    fetchFiles.mockResolvedValueOnce([directory]).mockResolvedValue([file]);
    const onSaveAs = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();
    jest.mocked(getFiles).mockResolvedValue({
        ...emptyDirectoryResponse,
        data: { ...emptyDirectoryResponse.data, children: [{
            name: file.name, isDir: false, gitClone: false, lastModifiedUnixMillis: 0n, type: '.taz', virtual: false,
        }] },
    });
    render(<SaveAsModal initialDirectoryPath=" /boards/ " initialFileName="copy" onClose={onClose} onSaveAs={onSaveAs} />);
    expect(await screen.findByTestId('tag-analyzer-save-as-file-name-input')).toHaveValue('copy.taz');
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-item-reports'), { detail: 2 });
    fireEvent.click(await screen.findByTestId('tag-analyzer-save-as-item-existing.taz'));
    expect(screen.getByTestId('tag-analyzer-save-as-directory-path')).toHaveValue('boards / reports');
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    const confirmation = await screen.findByTestId('file-overwrite-dialog');
    expect(getFiles).toHaveBeenCalledWith('/boards/reports/');
    expect(onSaveAs).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByTestId('cancel'));
    await waitFor(() => expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());
    expect(onSaveAs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    fireEvent.click(within(await screen.findByTestId('file-overwrite-dialog')).getByTestId('confirm'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaveAs).toHaveBeenCalledWith('/boards/reports/', 'existing.taz', true);
});

test('disables saving during navigation and keeps the dialog open after a failed save', async () => {
    let finishNavigation!: (files: FileListItem[]) => void;
    fetchFiles.mockResolvedValueOnce([directory]).mockImplementationOnce(() => new Promise((resolve) => { finishNavigation = resolve; }));
    const onSaveAs = jest.fn().mockResolvedValue(false);
    const onClose = jest.fn();
    render(<SaveAsModal initialDirectoryPath="/" initialFileName="copy.taz" onClose={onClose} onSaveAs={onSaveAs} />);
    fireEvent.click(await screen.findByTestId('tag-analyzer-save-as-item-reports'), { detail: 2 });
    expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeDisabled();
    await act(async () => finishNavigation([]));
    fireEvent.click(screen.getByTestId('tag-analyzer-save-as-submit-button'));
    await waitFor(() => expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeEnabled());
    expect(onSaveAs).toHaveBeenCalledWith('/reports/', 'copy.taz', false);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('tag-analyzer-save-as-file-name-input'), { target: { value: 'wrong.sql' } });
    expect(screen.getByTestId('tag-analyzer-save-as-submit-button')).toBeDisabled();
});
