// Video Sync Hook
import { PanelIdParser } from '@/utils/dashboardUtil';

export type SyncCommand = 'play' | 'pause' | 'seek';

export interface VideoTimeEvent {
    originPanelId: string;
    panelId: string;
    chartVariableId: string;
    currentTime: Date;
    duration: number;
    isPlaying: boolean;
    color: string;
    dependentPanels: string[];
    sync: boolean;
}

export interface VideoPlayerInterface {
    play: () => void;
    pause: () => void;
    seekToTime: (time: Date) => void;
    currentTime: Date | null;
    isPlaying: boolean;
}

interface VideoPanelStore {
    event: VideoTimeEvent;
    videoPlayer?: VideoPlayerInterface;
}

const stores = new Map<string, Map<string, VideoPanelStore>>();

// Debounce for seek command (origin panel based - single timer per origin)
const SEEK_DEBOUNCE_MS = 100;
const seekDebounceTimers = new Map<string, NodeJS.Timeout>();
const pendingSeekTargets = new Map<string, { time: Date; targets: Array<{ panelId: string; player: VideoPlayerInterface }> }>();

const executePendingSeek = (originPanelId: string) => {
    const pending = pendingSeekTargets.get(originPanelId);
    if (!pending) return;

    // Execute all seeks simultaneously
    pending.targets.forEach(({ player }) => {
        player.seekToTime(pending.time);
    });

    pendingSeekTargets.delete(originPanelId);
    seekDebounceTimers.delete(originPanelId);
};

const queueDebouncedSeek = (originPanelId: string, panelId: string, player: VideoPlayerInterface, time: Date) => {
    // Get or create pending seek for this origin
    let pending = pendingSeekTargets.get(originPanelId);
    if (!pending) {
        pending = { time, targets: [] };
        pendingSeekTargets.set(originPanelId, pending);
    }

    // Update time and add/update target
    pending.time = time;
    const existingIndex = pending.targets.findIndex((t) => t.panelId === panelId);
    if (existingIndex >= 0) {
        pending.targets[existingIndex] = { panelId, player };
    } else {
        pending.targets.push({ panelId, player });
    }

    // Reset debounce timer for this origin
    const existingTimer = seekDebounceTimers.get(originPanelId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => executePendingSeek(originPanelId), SEEK_DEBOUNCE_MS);
    seekDebounceTimers.set(originPanelId, timer);
};

const getStore = (id: string) => {
    if (!stores.has(id)) stores.set(id, new Map());
    return stores.get(id)!;
};

const getDependencies = (eventList: Map<string, VideoPanelStore>, curEvent: VideoTimeEvent): string[] => {
    const dependencies: Set<string> = new Set();
    eventList.forEach((value) => {
        if (value.event.panelId === curEvent.panelId) {
            value.event.dependentPanels.forEach((panelId: string) => {
                return dependencies.add(PanelIdParser(value.event.chartVariableId + '-' + panelId));
            });
        }
    });
    return Array.from(dependencies);
};

export const clearSyncBorder = (chartVariableId: string, panelId: string) => {
    const videoDom = document.getElementById(PanelIdParser(chartVariableId + '-' + panelId));
    if (videoDom) drawSyncBorder(videoDom, '', false);
};

const SYNC_BORDER_COLOR = '#ff9800';
const drawSyncBorder = (dom: HTMLElement, color: string, sync: boolean) => {
    const wrapper = dom.closest('.panel-wrap') as HTMLElement;
    const applyColor = sync ? SYNC_BORDER_COLOR : color;
    if (wrapper) wrapper.style.borderColor = applyColor;
};

export const clearTimeLineX = (dependentPanelIdList: string[]) => {
    dependentPanelIdList.forEach((panelId) => {
        const dom = document.getElementById(panelId);
        if (dom) {
            drawSyncBorder(dom, '', false);
            const _chart = (echarts as any)['getInstanceByDom'](dom as any) as any;
            if (_chart) {
                const graphicId = 'timeline-marker-' + panelId;
                _chart.setOption({
                    graphic: [{ id: graphicId, $action: 'remove' }],
                });
            }
        }
    });
};

const drawTimeLineX = (dependentPanelIdList: string[], color: string, curTime: Date, sync: boolean) => {
    dependentPanelIdList.forEach((panelId) => {
        const dom = document.getElementById(panelId);
        if (dom) {
            drawSyncBorder(dom, color, sync);
            const _chart = (echarts as any)['getInstanceByDom'](dom as any) as any;
            if (_chart) {
                const currentOption = _chart.getOption();

                const hasData = currentOption.series?.[0]?.data?.length > 0;
                if (!hasData) return;

                const gridComponent = _chart.getModel().getComponent('grid');
                if (!gridComponent?.coordinateSystem) return;

                const gridRect = gridComponent.coordinateSystem.getRect();
                const X_Line = _chart.convertToPixel({ gridIndex: 0 }, [curTime, 0])[0];

                if (isNaN(X_Line)) return;

                const graphicId = 'timeline-marker-' + panelId;

                _chart.setOption({
                    graphic: [
                        {
                            id: graphicId,
                            type: 'line',
                            z: 100,
                            shape: {
                                x1: X_Line,
                                y1: gridRect.y,
                                x2: X_Line,
                                y2: gridRect.y + gridRect.height,
                            },
                            style: {
                                stroke: color,
                                lineWidth: 1,
                                lineDash: [5],
                            },
                        },
                    ],
                });
            }
        }
    });
};

// Register video panel and its player
export const registerVideoPanel = (boardId: string, event: VideoTimeEvent, videoPlayer: VideoPlayerInterface) => {
    const store = getStore(boardId);
    store.set(event.panelId, { event, videoPlayer });
};

// Unregister video panel
export const unregisterVideoPanel = (boardId: string, panelId: string) => {
    const store = getStore(boardId);
    store.delete(panelId);
};

// Update video time (for chart line drawing only)
export const updateVideoTime = (boardId: string, event: VideoTimeEvent) => {
    const store = getStore(boardId);
    const existing = store.get(event.panelId);

    if (existing) {
        store.set(event.panelId, { ...existing, event });
    }

    // Draw chart line
    const dependentPanelList = getDependencies(store, event);
    if (dependentPanelList && dependentPanelList.length > 0) {
        const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));

        if (videoDom) drawSyncBorder(videoDom, event.color, event.sync);
        drawTimeLineX(dependentPanelList, event.color, event.currentTime, event.sync);
    }
};

// Send command to sync panels
export const emitVideoCommand = (boardId: string, originPanelId: string, command: SyncCommand, time?: Date) => {
    const store = getStore(boardId);

    store.forEach((value) => {
        // Skip if not sync enabled or is the origin panel
        if (!value.event.sync || value.event.panelId === originPanelId) return;

        const player = value.videoPlayer;
        if (!player) return;

        switch (command) {
            case 'play':
                player.play();
                break;
            case 'pause':
                player.pause();
                break;
            case 'seek':
                if (time) queueDebouncedSeek(originPanelId, value.event.panelId, player, time);
                break;
        }
    });
};

// Get all sync panel times for periodic correction
export const getSyncPanelTimes = (boardId: string): Map<string, Date | null> => {
    const store = getStore(boardId);
    const times = new Map<string, Date | null>();

    store.forEach((value, panelId) => {
        if (value.event.sync && value.videoPlayer) {
            times.set(panelId, value.videoPlayer.currentTime);
        }
    });

    return times;
};

// Correct time if difference exceeds threshold
export const correctSyncTime = (boardId: string, masterPanelId: string, masterTime: Date, threshold: number = 500) => {
    const store = getStore(boardId);

    store.forEach((value) => {
        if (!value.event.sync || value.event.panelId === masterPanelId) return;

        const player = value.videoPlayer;
        if (!player || !player.currentTime) return;

        const diff = Math.abs(masterTime.getTime() - player.currentTime.getTime());
        if (diff > threshold) {
            player.seekToTime(masterTime);
        }
    });
};
