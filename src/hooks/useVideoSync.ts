// Video Sync Hook
import { useEffect, useRef, useCallback } from 'react';
import { PanelIdParser } from '@/utils/dashboardUtil';

export type SyncCommand = 'play' | 'pause' | 'seek' | 'timeRangeChange' | 'loop';

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

// Active emit origin tracking (prevents infinite emit loops between sync panels)
let activeEmitOrigin: string | null = null;

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

export const drawTimeLineX = (dependentPanelIdList: string[], color: string, curTime: Date, sync: boolean) => {
    dependentPanelIdList.forEach((panelId) => {
        try {
            const dom = document.getElementById(panelId);
            if (!dom) {
                console.warn('[TIMELINE] DOM not found for panelId:', panelId);
                return;
            }

            drawSyncBorder(dom, color, sync);

            const _chart = (echarts as any)['getInstanceByDom'](dom as any) as any;
            if (!_chart) {
                console.warn('[TIMELINE] ECharts instance not found for panelId:', panelId);
                return;
            }

            const currentOption = _chart.getOption();
            const hasData = currentOption.series?.[0]?.data?.length > 0;
            if (!hasData) {
                console.warn('[TIMELINE] Chart has no data for panelId:', panelId);
                return;
            }

            const gridComponent = _chart.getModel().getComponent('grid');
            if (!gridComponent?.coordinateSystem) {
                console.warn('[TIMELINE] Grid coordinate system not found for panelId:', panelId);
                return;
            }

            const gridRect = gridComponent.coordinateSystem.getRect();
            const X_Line = _chart.convertToPixel({ gridIndex: 0 }, [curTime, 0])[0];

            if (isNaN(X_Line)) {
                console.warn('[TIMELINE] Invalid X position for panelId:', panelId, 'curTime:', curTime);
                return;
            }

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
            console.log('[TIMELINE] Successfully drew timeline for panelId:', panelId, 'at X:', X_Line);
        } catch (err) {
            console.error('[TIMELINE] Error drawing timeline for panelId:', panelId, err);
        }
    });
};

// Register video panel and its player
export const registerVideoPanel = (boardId: string, event: VideoTimeEvent, videoPlayer: VideoPlayerInterface) => {
    const store = getStore(boardId);
    store.set(event.panelId, { event, videoPlayer });

    // Draw initial border and timeline (if not live mode and has dependents)
    // Use setTimeout to ensure DOM is ready (charts may not be mounted yet)
    if (!event.isLive && event.dependentPanels.length > 0) {
        setTimeout(() => {
            const dependentPanelList = event.dependentPanels.map((depPanelId) => PanelIdParser(event.chartVariableId + '-' + depPanelId));

            // Draw border on video panel
            const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
            if (videoDom) drawSyncBorder(videoDom, event.color, event.sync);

            // Draw timeline on dependent charts
            drawTimeLineX(dependentPanelList, event.color, event.currentTime, event.sync);
        }, 100); // 100ms delay to ensure charts are rendered
    }
};

// Update video panel event (for option changes without re-register)
export const updateVideoPanelEvent = (boardId: string, panelId: string, event: VideoTimeEvent, videoPlayer: VideoPlayerInterface, isLiveMode?: boolean) => {
    if (!stores.has(boardId)) return;
    const store = stores.get(boardId)!;

    if (!store.has(panelId)) {
        // Panel not in store - register it first
        registerVideoPanel(boardId, event, videoPlayer);

        // If entering live mode, clear border and timeline
        if (isLiveMode) {
            const dependentPanelList = getDependencies(store, event);
            if (dependentPanelList && dependentPanelList.length > 0) clearTimeLineX(dependentPanelList);

            const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
            if (videoDom) drawSyncBorder(videoDom, '', false);
        }
        return;
    }

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

        syncChanged && console.log('[UPDATE-EVENT] syncChanged', syncChanged);
        liveChanged && console.log('[UPDATE-EVENT] liveChanged', liveChanged);
        timeRangeChanged && console.log('[UPDATE-EVENT] timeRangeChanged', timeRangeChanged);
        console.log('[UPDATE-EVENT] modeChanged:', modeChanged, 'timeRangeChanged:', timeRangeChanged, 'panelId:', panelId);

        // Update store
        store.set(panelId, { event, videoPlayer });

        const dependentPanelList = getDependencies(store, event);

        // When in live mode, clear existing border and timeline
        if (isLiveMode) {
            if (dependentPanelList && dependentPanelList.length > 0) clearTimeLineX(dependentPanelList);

            const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
            if (videoDom) drawSyncBorder(videoDom, '', false);
        } else {
            // Draw sync border and timeline only when mode or time range changes (not on every currentTime update)
            if (dependentPanelList && dependentPanelList.length > 0 && (modeChanged || timeRangeChanged)) {
                console.log('[UPDATE-EVENT] Drawing timeline because modeChanged or timeRangeChanged for panelId:', panelId);
                setTimeout(() => {
                    const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
                    if (videoDom) drawSyncBorder(videoDom, event.color, event.sync);
                    drawTimeLineX(dependentPanelList, event.color, event.currentTime, event.sync);
                }, 200); // 200ms delay to ensure charts are rendered and have data
            }
        }

        // Emit time range events to dependent chart panels
        const enteringLive = !prevIsLive && event.isLive;
        const enteringSync = !prevSync && event.sync;
        const leavingSync = prevSync && !event.sync;

        if (enteringLive) {
            // Entering live mode → clear chart time range (revert to dashboard)
            emitTimeRangeClear(boardId, panelId, event.chartVariableId);
            return;
        } else if (leavingSync) {
            // Leaving sync mode → pause video
            console.log('[SYNC] Leaving sync mode - pausing video:', panelId);
            videoPlayer.pause();
            // Clear sync border
            const videoDom = document.getElementById(PanelIdParser(event.chartVariableId + '-' + event.panelId));
            if (videoDom) drawSyncBorder(videoDom, event.color, false);
        } else if (!event.isLive && event.start && event.end) {
            if (enteringSync) {
                console.log('[SYNC] Entering sync mode:', { panelId, event });

                // Find current Virtual Master or any existing sync panel to copy state
                const store = getStore(boardId);
                const syncMaster = getSyncMaster(boardId);
                const currentVirtualMasterId = syncMaster.getState().currentVirtualMaster;

                console.log('[SYNC] Current Virtual Master:', currentVirtualMasterId);
                console.log('[SYNC] SyncMaster state:', syncMaster.getState());

                let referenceSyncPanel: VideoPanelStore | null = null;

                // First, try to find the current Virtual Master
                if (currentVirtualMasterId) {
                    const virtualMasterPanel = store.get(currentVirtualMasterId);
                    if (virtualMasterPanel && virtualMasterPanel.event.sync && !virtualMasterPanel.event.isLive) {
                        referenceSyncPanel = virtualMasterPanel;
                    }
                }

                // If no Virtual Master, find any existing sync panel
                if (!referenceSyncPanel) {
                    for (const [id, value] of store.entries()) {
                        if (id !== panelId && value.event.sync && !value.event.isLive) {
                            referenceSyncPanel = value;
                            break;
                        }
                    }
                }

                if (referenceSyncPanel !== null && videoPlayer?.applyTimeRange) {
                    console.log('[SYNC] Found reference sync panel:', {
                        refPanelId: referenceSyncPanel.event.panelId,
                        refTimeRange: { start: referenceSyncPanel.event.start, end: referenceSyncPanel.event.end },
                        refCurrentTime: referenceSyncPanel.videoPlayer?.currentTime,
                        refIsPlaying: referenceSyncPanel.videoPlayer?.isPlaying
                    });

                    const syncEvent = referenceSyncPanel.event;
                    const syncPlayer = referenceSyncPanel.videoPlayer;

                    if (syncEvent.start && syncEvent.end) {
                        const applyTimeRange = videoPlayer.applyTimeRange!;
                        (async () => {
                            console.log('[SYNC] Applying time range:', { start: syncEvent.start, end: syncEvent.end });
                            await applyTimeRange(syncEvent.start!, syncEvent.end!);

                            // Sync current position from reference panel's videoPlayer
                            if (syncPlayer?.currentTime) {
                                console.log('[SYNC] Seeking to reference time:', syncPlayer.currentTime);
                                videoPlayer.seekToTime(syncPlayer.currentTime);
                                console.log('[SYNC] Seek completed');
                            }

                            // Check current master state to determine if we should play or pause
                            const syncMaster = getSyncMaster(boardId);
                            const masterState = syncMaster.getState();
                            console.log('[SYNC] Master state after entering sync:', {
                                isPlaying: masterState.isPlaying,
                                currentVirtualMaster: masterState.currentVirtualMaster
                            });

                            if (masterState.isPlaying) {
                                // Master says we should be playing → start playback
                                console.log('[SYNC] Master is playing - starting playback (entering sync)');
                                videoPlayer.play();
                            } else {
                                // Master says we should be paused → pause (no broadcast to avoid disrupting others)
                                console.log('[SYNC] Master is paused - pausing self (entering sync)');
                                videoPlayer.pause();
                            }
                        })();
                    }
                } else {
                    console.log('[SYNC] First sync panel - setting as base');
                    // First sync panel - set as base and pause
                    setSyncTimeRangeBase(boardId, event.start, event.end);
                    videoPlayer.pause();
                }
            } else if (modeChanged || timeRangeChanged) {
                // Sync mode: update sync base when time range changes
                if (event.sync && timeRangeChanged) setSyncTimeRangeBase(boardId, event.start, event.end);
                // Mode changed or time range changed → emit
                emitTimeRangeChange(boardId, panelId, event.chartVariableId, event.start, event.end);
            }
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
    stores.delete(boardId);
    timeRangeListeners.delete(boardId);
    clearSyncMaster(boardId);
};

// Clear all video stores (call when needed to reset everything)
export const clearAllVideoStores = () => {
    stores.clear();
    timeRangeListeners.clear();
    syncMasters.forEach((master) => master.destroy());
    syncMasters.clear();
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
    // Wait for all store updates to complete (other panels' useEffect may still be pending)
    await new Promise((resolve) => setTimeout(resolve, 0));

    console.log('emitTimeRangeChange');

    // Prevent infinite emit loops (check after waiting)
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

        // Allow React to process state updates from applyTimeRange
        await new Promise((resolve) => setTimeout(resolve, 0));

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

// ============================================
// Video Panel State Query (for dependent charts)
// ============================================

// Get video panel state for a dependent chart
// Returns the video panel info if this chart is a dependent of any video panel
export const getVideoPanelStateForChart = (boardId: string, chartPanelId: string): { isLive: boolean } | null => {
    const store = stores.get(boardId);
    if (!store) return null;

    for (const [_, value] of store) {
        if (value.event.dependentPanels.includes(chartPanelId)) {
            return { isLive: value.event.isLive };
        }
    }
    return null;
};

// ============================================
// Virtual Sync Master
// ============================================

interface SyncMasterState {
    isPlaying: boolean;
    currentTime: Date | null;
    timeRange: { start: Date; end: Date } | null;
    loopEnabled: boolean;
    currentVirtualMaster: string | null; // ID of the current Virtual Master panel
}

interface SyncCommandPayload {
    action: SyncCommand;
    origin: string; // Virtual Master panel ID
    time?: Date;
    timeRange?: { start: Date; end: Date };
    isDragging?: boolean;
}

type SyncCommandListener = (command: SyncCommandPayload) => void;

class SyncMaster {
    private boardId: string;
    private state: SyncMasterState = {
        isPlaying: false,
        currentTime: null,
        timeRange: null,
        loopEnabled: true,
        currentVirtualMaster: null,
    };
    private listeners = new Map<string, SyncCommandListener>();
    private correctionInterval: NodeJS.Timeout | null = null;
    private readonly CORRECTION_INTERVAL_MS = 1000;
    private readonly CORRECTION_THRESHOLD_MS = 500;

    constructor(boardId: string) {
        this.boardId = boardId;
    }

    // Subscribe to sync commands
    subscribe(panelId: string, listener: SyncCommandListener) {
        console.log('[SYNC-MASTER] Subscribe:', { panelId, totalListeners: this.listeners.size + 1 });
        this.listeners.set(panelId, listener);
    }

    // Unsubscribe from sync commands
    unsubscribe(panelId: string) {
        this.listeners.delete(panelId);

        // If unsubscribing panel was the Virtual Master, clear it
        if (this.state.currentVirtualMaster === panelId) {
            this.state.currentVirtualMaster = null;
            this.stopCorrection();
        }
    }

    // Broadcast command to all listeners except origin
    private broadcast(command: SyncCommandPayload) {
        console.log('[SYNC-MASTER] Broadcasting command:', {
            action: command.action,
            origin: command.origin,
            totalListeners: this.listeners.size,
            recipients: Array.from(this.listeners.keys()).filter(id => id !== command.origin)
        });
        this.listeners.forEach((listener, panelId) => {
            if (panelId !== command.origin) {
                console.log('[SYNC-MASTER] Sending to:', panelId);
                listener(command);
            }
        });
    }

    // Play command - origin becomes Virtual Master
    play(origin: string) {
        this.state.currentVirtualMaster = origin;
        this.state.isPlaying = true;
        this.broadcast({ action: 'play', origin });
        this.startCorrection(origin);
    }

    // Pause command - origin becomes Virtual Master
    pause(origin: string) {
        console.log('[SYNC-MASTER] Pause command:', { origin, prevVirtualMaster: this.state.currentVirtualMaster });
        this.state.currentVirtualMaster = origin;
        this.state.isPlaying = false;
        this.broadcast({ action: 'pause', origin });
        this.stopCorrection();
    }

    // Seek command - origin becomes Virtual Master
    seek(origin: string, time: Date, options?: { isDragging?: boolean }) {
        console.log('[SYNC-MASTER] Seek command:', { origin, time, prevVirtualMaster: this.state.currentVirtualMaster });
        this.state.currentVirtualMaster = origin;
        this.state.currentTime = time;
        this.state.isPlaying = false; // Seeking should pause playback
        this.broadcast({ action: 'seek', origin, time, isDragging: options?.isDragging });
        this.stopCorrection(); // Stop correction interval when paused
    }

    // Time range change command - origin becomes Virtual Master
    setTimeRange(origin: string, start: Date, end: Date) {
        console.log('update modal time range');
        this.state.currentVirtualMaster = origin;
        this.state.timeRange = { start, end };
        this.state.currentTime = start;
        this.broadcast({ action: 'timeRangeChange', origin, timeRange: { start, end } });
    }

    // Loop command (when video reaches end) - origin becomes Virtual Master
    loop(origin: string) {
        if (!this.state.loopEnabled || !this.state.timeRange) return;

        this.state.currentVirtualMaster = origin;
        const startTime = this.state.timeRange.start;
        this.state.currentTime = startTime;
        this.broadcast({ action: 'loop', origin, time: startTime });
    }

    // Update current time (from origin panel's timeupdate)
    updateCurrentTime(_origin: string, time: Date) {
        this.state.currentTime = time;
    }

    // Get current master state
    getState(): SyncMasterState {
        return { ...this.state };
    }

    // Set loop enabled
    setLoopEnabled(enabled: boolean) {
        this.state.loopEnabled = enabled;
    }

    // Start periodic correction (Virtual Master provides time reference)
    private startCorrection(virtualMasterPanelId: string) {
        this.stopCorrection();

        this.correctionInterval = setInterval(() => {
            if (!this.state.isPlaying || !this.state.currentTime) return;

            // Get Virtual Master panel's current time from store
            const store = stores.get(this.boardId);
            const virtualMasterPanel = store?.get(virtualMasterPanelId);
            if (!virtualMasterPanel?.videoPlayer?.currentTime) return;

            const virtualMasterTime = virtualMasterPanel.videoPlayer.currentTime;

            // Check and correct all Slave panels (all panels except Virtual Master)
            store?.forEach((value, panelId) => {
                if (panelId === virtualMasterPanelId || !value.event.sync || value.event.isLive) return;
                if (!value.videoPlayer?.currentTime) return;

                const diff = Math.abs(virtualMasterTime.getTime() - value.videoPlayer.currentTime.getTime());
                if (diff > this.CORRECTION_THRESHOLD_MS) {
                    value.videoPlayer.seekToTime(virtualMasterTime);
                }
            });
        }, this.CORRECTION_INTERVAL_MS);
    }

    // Stop periodic correction
    private stopCorrection() {
        if (this.correctionInterval) {
            clearInterval(this.correctionInterval);
            this.correctionInterval = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopCorrection();
        this.listeners.clear();
    }
}

// Sync masters per board
const syncMasters = new Map<string, SyncMaster>();

const getSyncMaster = (boardId: string): SyncMaster => {
    if (!syncMasters.has(boardId)) {
        syncMasters.set(boardId, new SyncMaster(boardId));
    }
    return syncMasters.get(boardId)!;
};

export const clearSyncMaster = (boardId: string) => {
    const master = syncMasters.get(boardId);
    if (master) {
        master.destroy();
        syncMasters.delete(boardId);
    }
};

// ============================================
// useVideoPanelSync Hook
// ============================================

export interface UseVideoPanelSyncOptions {
    boardId: string;
    panelId: string;
    chartVariableId: string;

    // Getters (ref-based to avoid re-renders)
    getCurrentTime: () => Date | null;
    getIsPlaying: () => boolean;
    getTimeRange: () => { start: Date | null; end: Date | null };
    getIsLive: () => boolean;

    // Callbacks for sync commands
    onSyncSeek: (time: Date) => Promise<void> | void;
    onSyncPlay: () => void;
    onSyncPause: () => void;
    onSyncTimeRange: (start: Date, end: Date) => Promise<void> | void;
    onSyncLoop: (startTime: Date) => Promise<void> | void;

    // Settings
    syncEnabled: boolean;
    dependentPanels: string[];
    color: string;

    // Video player reference for registration
    videoPlayer: VideoPlayerInterface;
}

export interface UseVideoPanelSyncReturn {
    // Sync-aware actions (use these instead of direct videoPlayer calls)
    play: () => void;
    pause: () => void;
    seek: (time: Date, options?: { isDragging?: boolean }) => Promise<void> | void;
    setTimeRange: (start: Date, end: Date) => Promise<void> | void;

    // Called when video reaches end (for loop handling)
    handleVideoEnded: () => void;

    // Called on timeupdate (for master time tracking)
    handleTimeUpdate: (time: Date) => void;

    // Notify dependent charts of time range (for dashboard refresh)
    notifyDependentCharts: (start: Date, end: Date) => void;
}

export function useVideoPanelSync(options: UseVideoPanelSyncOptions): UseVideoPanelSyncReturn {
    const {
        boardId,
        panelId,
        chartVariableId,
        getCurrentTime,
        getIsPlaying,
        getTimeRange,
        getIsLive,
        onSyncSeek,
        onSyncPlay,
        onSyncPause,
        onSyncTimeRange,
        // onSyncLoop is accessed via optionsRef.current
        syncEnabled,
        dependentPanels,
        color,
        videoPlayer,
    } = options;

    // Ref to always have latest options without re-subscribing
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Register/unregister with store and sync master
    useEffect(() => {
        const timeRange = getTimeRange();
        const currentTime = getCurrentTime();

        console.log('timeRange', timeRange);
        console.log('curretnTIm', currentTime);

        const event: VideoTimeEvent = {
            originPanelId: panelId,
            panelId,
            chartVariableId,
            currentTime: currentTime || new Date(),
            duration: timeRange.start && timeRange.end ? timeRange.end.getTime() - timeRange.start.getTime() : 0,
            isPlaying: getIsPlaying(),
            color,
            dependentPanels,
            sync: syncEnabled,
            isLive: getIsLive(),
            start: timeRange.start,
            end: timeRange.end,
        };

        registerVideoPanel(boardId, event, videoPlayer);

        // Subscribe to sync master if sync enabled
        if (syncEnabled && !getIsLive()) {
            const master = getSyncMaster(boardId);
            master.subscribe(panelId, (command) => {
                const opts = optionsRef.current;
                console.log('[SYNC-LISTENER] Received command:', { panelId, action: command.action, origin: command.origin });
                if (opts.getIsLive()) return; // Ignore sync commands in live mode

                switch (command.action) {
                    case 'play':
                        console.log('[SYNC-LISTENER] Executing play:', panelId);
                        opts.onSyncPlay();
                        break;
                    case 'pause':
                        console.log('[SYNC-LISTENER] Executing pause:', panelId);
                        opts.onSyncPause();
                        break;
                    case 'seek':
                        if (command.time) {
                            console.log('[SYNC-LISTENER] Executing seek:', panelId, 'to time:', command.time);
                            opts.onSyncSeek(command.time);
                            // Seek should also pause the video
                            console.log('[SYNC-LISTENER] Auto-pausing after seek:', panelId);
                            opts.onSyncPause();
                        }
                        break;
                    case 'timeRangeChange':
                        if (command.timeRange) {
                            console.log('[SYNC-LISTENER] Executing timeRangeChange:', panelId);
                            opts.onSyncTimeRange(command.timeRange.start, command.timeRange.end);
                        }
                        break;
                    case 'loop':
                        if (command.time) {
                            console.log('[SYNC-LISTENER] Executing loop:', panelId);
                            opts.onSyncLoop(command.time);
                        }
                        break;
                }
            });

            // Check if there are existing sync panels and sync with them
            console.log('[SYNC] Checking for existing sync panels on registration');
            const store = getStore(boardId);
            const currentVirtualMasterId = master.getState().currentVirtualMaster;

            let referenceSyncPanel: VideoPanelStore | null = null;

            // First, try to find the current Virtual Master
            if (currentVirtualMasterId) {
                const virtualMasterPanel = store.get(currentVirtualMasterId);
                if (virtualMasterPanel && virtualMasterPanel.event.sync && !virtualMasterPanel.event.isLive) {
                    referenceSyncPanel = virtualMasterPanel;
                }
            }

            // If no Virtual Master, find any existing sync panel
            if (!referenceSyncPanel) {
                for (const [id, value] of store.entries()) {
                    if (id !== panelId && value.event.sync && !value.event.isLive) {
                        referenceSyncPanel = value;
                        break;
                    }
                }
            }

            if (referenceSyncPanel !== null && videoPlayer?.applyTimeRange) {
                console.log('[SYNC] Found existing sync panel on registration:', {
                    refPanelId: referenceSyncPanel.event.panelId,
                    refTimeRange: { start: referenceSyncPanel.event.start, end: referenceSyncPanel.event.end },
                    refCurrentTime: referenceSyncPanel.videoPlayer?.currentTime,
                    refIsPlaying: referenceSyncPanel.videoPlayer?.isPlaying
                });

                const syncEvent = referenceSyncPanel.event;
                const syncPlayer = referenceSyncPanel.videoPlayer;

                if (syncEvent.start && syncEvent.end) {
                    (async () => {
                        console.log('[SYNC] Applying time range on registration:', { start: syncEvent.start, end: syncEvent.end });
                        await videoPlayer.applyTimeRange!(syncEvent.start!, syncEvent.end!);

                        // Sync current position from reference panel's videoPlayer
                        if (syncPlayer?.currentTime) {
                            console.log('[SYNC] Seeking to reference time on registration:', syncPlayer.currentTime);
                            videoPlayer.seekToTime(syncPlayer.currentTime);
                            console.log('[SYNC] Seek completed on registration');
                        }

                        // Check current master state to determine if we should play or pause
                        const masterState = master.getState();
                        console.log('[SYNC] Master state after sync:', {
                            isPlaying: masterState.isPlaying,
                            currentVirtualMaster: masterState.currentVirtualMaster
                        });

                        if (masterState.isPlaying) {
                            // Master says we should be playing → start playback
                            console.log('[SYNC] Master is playing - starting playback on registration');
                            videoPlayer.play();
                        } else {
                            // Master says we should be paused → pause (no broadcast to avoid disrupting others)
                            console.log('[SYNC] Master is paused - pausing self on registration');
                            videoPlayer.pause();
                        }
                    })();
                }
            }
        }

        return () => {
            // If leaving sync mode while playing, pause the video
            if (syncEnabled && videoPlayer.isPlaying) {
                console.log('[SYNC] Cleanup: pausing video before unregistering:', panelId);
                videoPlayer.pause();
            }

            unregisterVideoPanel(boardId, panelId);
            const master = syncMasters.get(boardId);
            if (master) {
                master.unsubscribe(panelId);
            }
        };
    }, [boardId, panelId, syncEnabled]);

    // Stable key for dependentPanels (compare by content, not reference)
    const dependentPanelsKey = dependentPanels.join(',');

    // Update store when options change
    useEffect(() => {
        const vp = optionsRef.current.videoPlayer;
        const timeRange = getTimeRange();
        const currentTime = getCurrentTime();
        const isLive = getIsLive();

        const event: VideoTimeEvent = {
            originPanelId: panelId,
            panelId,
            chartVariableId,
            currentTime: currentTime || new Date(),
            duration: timeRange.start && timeRange.end ? timeRange.end.getTime() - timeRange.start.getTime() : 0,
            isPlaying: getIsPlaying(),
            color,
            dependentPanels,
            sync: syncEnabled,
            isLive,
            start: timeRange.start,
            end: timeRange.end,
        };

        updateVideoPanelEvent(boardId, panelId, event, vp, isLive);
        // Now that getters are memoized in VideoPanel, this only runs when actual values change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncEnabled, chartVariableId, color, dependentPanelsKey, getTimeRange, getIsLive]);

    // Sync-aware play
    const play = useCallback(() => {
        console.log('[SYNC-ACTION] Play called:', { panelId, syncEnabled, isLive: getIsLive() });
        onSyncPlay();
        if (syncEnabled && !getIsLive()) {
            console.log('[SYNC-ACTION] Broadcasting play to SyncMaster');
            getSyncMaster(boardId).play(panelId);
        } else {
            console.log('[SYNC-ACTION] Skip broadcast - syncEnabled:', syncEnabled, 'isLive:', getIsLive());
        }
    }, [boardId, panelId, syncEnabled, onSyncPlay, getIsLive]);

    // Sync-aware pause
    const pause = useCallback(() => {
        console.log('[SYNC-ACTION] Pause called:', { panelId, syncEnabled, isLive: getIsLive() });
        onSyncPause();
        if (syncEnabled && !getIsLive()) {
            console.log('[SYNC-ACTION] Broadcasting pause to SyncMaster');
            getSyncMaster(boardId).pause(panelId);
        } else {
            console.log('[SYNC-ACTION] Skip broadcast - syncEnabled:', syncEnabled, 'isLive:', getIsLive());
        }
    }, [boardId, panelId, syncEnabled, onSyncPause, getIsLive]);

    // Sync-aware seek
    const seek = useCallback(
        async (time: Date, opts?: { isDragging?: boolean }) => {
            console.log('[SYNC-ACTION] Seek called:', { panelId, time, syncEnabled, isLive: getIsLive(), opts });
            await onSyncSeek(time);
            if (syncEnabled && !getIsLive()) {
                console.log('[SYNC-ACTION] Broadcasting seek to SyncMaster');
                getSyncMaster(boardId).seek(panelId, time, opts);
            } else {
                console.log('[SYNC-ACTION] Skip broadcast - syncEnabled:', syncEnabled, 'isLive:', getIsLive());
            }
        },
        [boardId, panelId, syncEnabled, onSyncSeek, getIsLive]
    );

    // Sync-aware time range change
    const setTimeRange = useCallback(
        async (start: Date, end: Date) => {
            console.log('[[setTime range]]', start, end);
            await onSyncTimeRange(start, end);

            if (syncEnabled && !getIsLive()) {
                getSyncMaster(boardId).setTimeRange(panelId, start, end);
            }
        },
        [boardId, panelId, syncEnabled, onSyncTimeRange, getIsLive]
    );

    // Handle video ended (for loop)
    const handleVideoEnded = useCallback(() => {
        if (syncEnabled && !getIsLive()) {
            getSyncMaster(boardId).loop(panelId);
        }
    }, [boardId, panelId, syncEnabled, getIsLive]);

    // Handle time update (for master tracking)
    const handleTimeUpdate = useCallback(
        (time: Date) => {
            if (syncEnabled && !getIsLive()) {
                getSyncMaster(boardId).updateCurrentTime(panelId, time);
            }
        },
        [boardId, panelId, syncEnabled, getIsLive]
    );

    // Notify dependent charts of time range (for dashboard refresh)
    // This only notifies chart panels, not other video panels
    const notifyDependentCharts = useCallback(
        (start: Date, end: Date) => {
            const listeners = timeRangeListeners.get(boardId);
            if (!listeners) return;

            const event: TimeRangeEvent = { originPanelId: panelId, chartVariableId, start, end };

            // Only notify this panel's dependent charts (not sync video panels)
            dependentPanels.forEach((depPanelId) => {
                const listener = listeners.get(depPanelId);
                if (listener) {
                    listener(event);
                }
            });
        },
        [boardId, panelId, chartVariableId, dependentPanels]
    );

    return {
        play,
        pause,
        seek,
        setTimeRange,
        handleVideoEnded,
        handleTimeUpdate,
        notifyDependentCharts,
    };
}
