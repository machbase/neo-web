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
    isLive: boolean;
    start: Date | null;
    end: Date | null;
}

export interface TimeRangeEvent {
    originPanelId: string;
    chartVariableId: string;
    start: Date | null;
    end: Date | null;
    clear?: boolean; // When true, chart should revert to dashboard time range
}

export type TimeRangeListener = (event: TimeRangeEvent) => void;

export interface VideoPlayerInterface {
    play: () => void;
    pause: () => void;
    seekToTime: (time: Date) => void;
    applyTimeRange?: (start: Date, end: Date) => Promise<void>;
    currentTime: Date | null;
    isPlaying: boolean;
}

interface VideoPanelStore {
    event: VideoTimeEvent;
    videoPlayer?: VideoPlayerInterface;
}

const stores = new Map<string, Map<string, VideoPanelStore>>();

// Time range change listeners: boardId -> panelId -> listener
const timeRangeListeners = new Map<string, Map<string, TimeRangeListener>>();

// Sync time range base: boardId -> { start, end } (first sync panel's time range becomes the base)
const syncTimeRangeBase = new Map<string, { start: Date; end: Date }>();

// Normal time range backup: boardId -> panelId -> { start, end } (backup for restoring when exiting sync mode)
const normalTimeRangeBackup = new Map<string, Map<string, { start: Date; end: Date }>>();

// Active emit origin tracking (prevents infinite emit loops between sync panels)
let activeEmitOrigin: string | null = null;

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

export const getStore = (id: string) => {
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
        try {
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
        } catch {
            // Chart may be in transitional state, ignore
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

// Update video panel event (for option changes without re-register)
export const updateVideoPanelEvent = (boardId: string, panelId: string, event: VideoTimeEvent, videoPlayer: VideoPlayerInterface, skipDraw?: boolean) => {
    if (!stores.has(boardId)) return;
    const store = stores.get(boardId)!;

    if (store.has(panelId)) {
        // Get previous state for change detection
        const prevStore = store.get(panelId);
        const prevSync = prevStore?.event.sync;
        const prevIsLive = prevStore?.event.isLive;
        const prevStart = prevStore?.event.start?.getTime();
        const prevEnd = prevStore?.event.end?.getTime();

        // Detect changes
        const syncChanged = prevSync !== event.sync;
        const liveChanged = prevIsLive !== event.isLive;
        const modeChanged = syncChanged || liveChanged;
        const timeRangeChanged = prevStart !== event.start?.getTime() || prevEnd !== event.end?.getTime();

        // Update store
        store.set(panelId, { event, videoPlayer });

        const dependentPanelList = getDependencies(store, event);

        // When in live mode, clear existing border and timeline
        if (skipDraw) {
            if (dependentPanelList && dependentPanelList.length > 0) {
                clearTimeLineX(dependentPanelList);
            }
            const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
            if (videoDom) drawSyncBorder(videoDom, '', false);
        } else {
            // Draw sync border and timeline
            if (dependentPanelList && dependentPanelList.length > 0) {
                const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
                if (videoDom) drawSyncBorder(videoDom, event.color, event.sync);
                drawTimeLineX(dependentPanelList, event.color, event.currentTime, event.sync);
            }
        }

        // Emit time range events to dependent chart panels
        const enteringLive = !prevIsLive && event.isLive;
        const enteringSync = !prevSync && event.sync;
        const isChainedFromEmit = activeEmitOrigin !== null;

        if (enteringLive) {
            // Entering live mode → clear chart time range (revert to dashboard)
            emitTimeRangeClear(boardId, panelId, event.chartVariableId);
        } else if (!isChainedFromEmit && !enteringSync && !event.isLive && event.start && event.end && (modeChanged || timeRangeChanged)) {
            // Skip emit when entering sync mode (syncBase will be applied first, then timeRangeChanged will trigger emit)
            // Not live and not from emit chain and (mode changed OR time range changed) → emit time range
            emitTimeRangeChange(boardId, panelId, event.chartVariableId, event.start, event.end);
        }
    }
};

// Handle panel edit (id change and type change)
export const handlePanelEdit = (boardId: string, oldPanelId: string, newPanelId: string, isNewTypeVideo: boolean) => {
    if (!stores.has(boardId)) return;
    const store = stores.get(boardId)!;
    const panelStore = store.get(oldPanelId);

    // If old panel was video type
    if (panelStore) {
        if (isNewTypeVideo) {
            // Video → Video: update id
            const updatedEvent = {
                ...panelStore.event,
                originPanelId: newPanelId,
                panelId: newPanelId,
            };
            store.set(newPanelId, { ...panelStore, event: updatedEvent });
        }
        // Video → Other or Video → Video: delete old entry
        store.delete(oldPanelId);
    }

    // Update dependentPanels in other video panels that reference the old panel id
    store.forEach((value, panelId) => {
        const { dependentPanels } = value.event;
        if (dependentPanels.includes(oldPanelId)) {
            const updatedDependentPanels = dependentPanels.map((depId) => (depId === oldPanelId ? newPanelId : depId));
            const updatedEvent = {
                ...value.event,
                dependentPanels: updatedDependentPanels,
            };
            store.set(panelId, { ...value, event: updatedEvent });
        }
    });
    // Other → Video: will be registered when VideoPanel mounts
    // Other → Other: nothing to do
};

// Unregister video panel and clear resources
export const unregisterVideoPanel = (boardId: string, panelId: string) => {
    if (!stores.has(boardId)) return;
    const store = stores.get(boardId)!;
    const panelStore = store.get(panelId);

    // Clear resources if panel exists
    if (panelStore) {
        const { chartVariableId, dependentPanels } = panelStore.event;
        // Clear timeline markers on dependent panels
        const dependentPanelIdList = dependentPanels.map((depPanelId) => PanelIdParser(chartVariableId + '-' + depPanelId));
        dependentPanelIdList?.forEach((dependentPanelId: string) => {
            clearSyncBorder(dependentPanelId, panelId);
            const dependentDOM = document.getElementById(dependentPanelId);
            if (dependentDOM) {
                drawSyncBorder(dependentDOM, '', false);
                clearTimeLineX([dependentPanelId]);
            }
        });
    }

    store.delete(panelId);
};

// Clear all stores for a board (call on dashboard unmount)
export const clearBoardVideoStore = (boardId: string) => {
    // Clear stores
    stores.delete(boardId);

    // Clear time range listeners
    timeRangeListeners.delete(boardId);

    // Clear any pending debounce timers
    seekDebounceTimers.forEach((timer) => {
        clearTimeout(timer);
    });
    seekDebounceTimers.clear();
    pendingSeekTargets.clear();
};

// Clear all video stores (call when needed to reset everything)
export const clearAllVideoStores = () => {
    stores.clear();
    timeRangeListeners.clear();
    seekDebounceTimers.forEach((timer) => {
        clearTimeout(timer);
    });
    seekDebounceTimers.clear();
    pendingSeekTargets.clear();
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

// Subscribe to time range change events (for LineChart panels)
export const subscribeTimeRangeChange = (boardId: string, panelId: string, listener: TimeRangeListener) => {
    if (!timeRangeListeners.has(boardId)) {
        timeRangeListeners.set(boardId, new Map());
    }
    timeRangeListeners.get(boardId)!.set(panelId, listener);
};

// Unsubscribe from time range change events
export const unsubscribeTimeRangeChange = (boardId: string, panelId: string) => {
    timeRangeListeners.get(boardId)?.delete(panelId);
};

// Emit time range change to dependent panels
export const emitTimeRangeChange = async (boardId: string, originPanelId: string, chartVariableId: string, start: Date, end: Date) => {
    // Prevent infinite emit loops
    if (activeEmitOrigin !== null) return;

    activeEmitOrigin = originPanelId;

    try {
        const store = getStore(boardId);
        const listeners = timeRangeListeners.get(boardId);

        const event: TimeRangeEvent = { originPanelId, chartVariableId, start, end };

        // Get origin panel's sync status
        const originPanel = store.get(originPanelId);
        const originSyncEnabled = originPanel?.event.sync ?? false;

        // Collect target panels and applyTimeRange promises
        const targetPanelIds = new Set<string>();
        const applyPromises: Promise<void>[] = [];

        store.forEach((value) => {
            const { sync, isLive, dependentPanels, panelId } = value.event;

            const isOrigin = panelId === originPanelId;
            const shouldInclude = isOrigin || (sync && originSyncEnabled);
            const notLive = !isLive;

            if (shouldInclude && notLive) {
                // Collect dependent panels for listener notification
                dependentPanels.forEach((depPanelId) => {
                    targetPanelIds.add(depPanelId);
                });

                // Apply time range to sync video panels (not origin)
                if (!isOrigin && sync && originSyncEnabled && value.videoPlayer?.applyTimeRange) {
                    applyPromises.push(value.videoPlayer.applyTimeRange(start, end));
                }
            }
        });

        // Wait for all applyTimeRange to complete before releasing activeEmitOrigin
        await Promise.all(applyPromises);

        // Emit to collected panels (skip if no listeners)
        if (!listeners) return;

        targetPanelIds.forEach((panelId) => {
            const listener = listeners.get(panelId);
            if (listener) {
                listener(event);
            }
        });
    } finally {
        activeEmitOrigin = null;
    }
};

// Emit time range clear to dependent panels (revert to dashboard time range)
export const emitTimeRangeClear = (boardId: string, originPanelId: string, chartVariableId: string) => {
    const store = getStore(boardId);
    const listeners = timeRangeListeners.get(boardId);

    if (!listeners) return;

    const event: TimeRangeEvent = { originPanelId, chartVariableId, start: null, end: null, clear: true };

    // Get origin panel's dependent panels
    const originPanel = store.get(originPanelId);
    if (!originPanel) return;

    const { dependentPanels } = originPanel.event;

    // Emit clear event to dependent panels
    dependentPanels.forEach((depPanelId) => {
        const listener = listeners.get(depPanelId);
        if (listener) {
            listener(event);
        }
    });
};

// ============================================
// Sync Time Range Management
// ============================================

// Get sync time range base for a board
export const getSyncTimeRangeBase = (boardId: string): { start: Date; end: Date } | null => {
    return syncTimeRangeBase.get(boardId) || null;
};

// Set sync time range base (called when first sync panel appears or modal apply)
export const setSyncTimeRangeBase = (boardId: string, start: Date, end: Date) => {
    syncTimeRangeBase.set(boardId, { start, end });
};

// Clear sync time range base (called when all sync panels are gone)
export const clearSyncTimeRangeBase = (boardId: string) => {
    syncTimeRangeBase.delete(boardId);
};

// Check if any sync panel exists in the board (optionally exclude a specific panel)
export const hasSyncPanel = (boardId: string, excludePanelId?: string): boolean => {
    const store = stores.get(boardId);
    if (!store) return false;

    for (const [panelId, value] of store) {
        if (excludePanelId && panelId === excludePanelId) continue;
        if (value.event.sync && !value.event.isLive) {
            return true;
        }
    }
    return false;
};

// ============================================
// Normal Time Range Backup Management
// ============================================

// Backup normal time range for a panel
export const backupNormalTimeRange = (boardId: string, panelId: string, start: Date, end: Date) => {
    if (!normalTimeRangeBackup.has(boardId)) {
        normalTimeRangeBackup.set(boardId, new Map());
    }
    normalTimeRangeBackup.get(boardId)!.set(panelId, { start, end });
};

// Get backed up normal time range for a panel
export const getBackedUpNormalTimeRange = (boardId: string, panelId: string): { start: Date; end: Date } | null => {
    return normalTimeRangeBackup.get(boardId)?.get(panelId) || null;
};

// Clear normal time range backup for a panel
export const clearNormalTimeRangeBackup = (boardId: string, panelId: string) => {
    normalTimeRangeBackup.get(boardId)?.delete(panelId);
};
