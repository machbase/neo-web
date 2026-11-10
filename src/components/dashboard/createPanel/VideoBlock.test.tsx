import { fireEvent, render, screen } from '@testing-library/react';
import { getMediaServerConfig } from '@/api/repository/mediaSvr';
import { loadCameras } from '@/components/dashboard/panels/video/utils/api';
import { VideoBlock } from './VideoBlock';

jest.mock('@/api/repository/mediaSvr', () => ({ getMediaServerConfig: jest.fn() }));
jest.mock('@/components/dashboard/panels/video/utils/api', () => ({
    ...jest.requireActual('@/components/dashboard/panels/video/utils/api'),
    getMediaServerBaseUrl: () => 'http://blackbox:8000',
    loadCameras: jest.fn(),
}));
jest.mock('@/design-system/components', () => ({
    Page: {
        TabContainer: ({ children }: React.PropsWithChildren) => children,
        TabList: () => null,
        TabItem: () => null,
        Body: ({ children }: React.PropsWithChildren) => children,
    },
}));
jest.mock('./VideoBlockEvents', () => ({ VideoBlockEvents: () => null }));
jest.mock('./VideoBlockSource', () => ({
    VideoBlockSource: ({ cameraList, selectedCompositeValue, onCameraChange }: {
        cameraList: { label: string; value: string }[];
        selectedCompositeValue: string;
        onCameraChange: (value: string) => void;
    }) => (
        <select aria-label="Camera" value={selectedCompositeValue} onChange={(event) => onCameraChange(event.target.value)}>
            <option value="">Select a camera</option>
            {cameraList.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
        </select>
    ),
}));

it('requires an explicit selection before attaching a server ID to a legacy panel', async () => {
    jest.mocked(getMediaServerConfig).mockResolvedValue([{ id: 'server-1', alias: 'Gate', ip: 'blackbox', port: 8000 }]);
    jest.mocked(loadCameras).mockResolvedValue([{ id: 'camera-1' }]);
    const panel = { chartOptions: { source: { camera: 'camera-1', serverAlias: 'Gate', serverIp: 'blackbox', serverPort: 8000 } } };
    const setPanel = jest.fn();

    render(<VideoBlock pPanelOption={panel} pSetPanelOption={setPanel} />);

    const option = await screen.findByRole('option', { name: 'Gate / camera-1' });
    const picker = screen.getByRole('combobox', { name: 'Camera' });
    expect(picker).toHaveValue('');
    expect(setPanel).not.toHaveBeenCalled();

    fireEvent.change(picker, { target: { value: (option as HTMLOptionElement).value } });
    expect(setPanel.mock.calls[0][0](panel).chartOptions.source).toMatchObject({ camera: 'camera-1', serverId: 'server-1' });
});
