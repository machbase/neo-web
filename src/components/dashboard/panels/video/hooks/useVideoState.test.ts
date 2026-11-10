import { act, renderHook } from '@testing-library/react';
import { getTimeRange, loadCameras } from '../utils/api';
import { useVideoState } from './useVideoState';

jest.mock('../utils/api', () => ({
    loadCameras: jest.fn(),
    getTimeRange: jest.fn(),
}));

const baseUrl = 'http://blackbox:8000';
const mockLoadCameras = jest.mocked(loadCameras);
const mockGetTimeRange = jest.mocked(getTimeRange);

beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimeRange.mockResolvedValue(null);
});

it('leaves the panel empty when the saved camera is missing from the server', async () => {
    mockLoadCameras.mockResolvedValue([{ id: 'another-camera' }]);
    const { result } = renderHook(() => useVideoState());

    await act(async () => {
        await result.current.fetchCameras('saved-camera', baseUrl);
    });

    expect(result.current.state.camera).toBeNull();
    expect(mockGetTimeRange).not.toHaveBeenCalled();
});

it('keeps the saved camera even if another camera is first in the list', async () => {
    mockLoadCameras.mockResolvedValue([{ id: 'another-camera' }, { id: 'saved-camera' }]);
    const { result } = renderHook(() => useVideoState());

    await act(async () => {
        await result.current.fetchCameras('saved-camera', baseUrl);
    });

    expect(result.current.state.camera).toBe('saved-camera');
    expect(mockGetTimeRange).toHaveBeenCalledWith('saved-camera', baseUrl);
});
