import { useEffect, useRef } from 'react';
import type {
    PanelBoardCommands,
    PanelCommandRegistry,
} from '../domain/BoardModel';

export function useRegisterActivePanelCommands({
    panelKey,
    isActiveTab,
    commands,
    initializeWhenReady,
    registerPanelCommands,
}: {
    panelKey: string;
    isActiveTab: boolean;
    commands: PanelBoardCommands;
    initializeWhenReady: () => void;
    registerPanelCommands: PanelCommandRegistry['registerPanelCommands'];
}) {
    const commandsRef = useRef(commands);
    const initializeWhenReadyRef = useRef(initializeWhenReady);

    commandsRef.current = commands;
    initializeWhenReadyRef.current = initializeWhenReady;

    useEffect(() => {
        if (!isActiveTab) {
            return undefined;
        }

        const unregister = registerPanelCommands(panelKey, {
            refreshData: () => commandsRef.current.refreshData(),
            refreshTime: () => commandsRef.current.refreshTime(),
            applyBoardTimeRange: (timeRange) =>
                commandsRef.current.applyBoardTimeRange(timeRange),
            applyGlobalTimeRange: (globalTimeRange) =>
                commandsRef.current.applyGlobalTimeRange(globalTimeRange),
        });

        initializeWhenReadyRef.current();
        return unregister;
    }, [isActiveTab, panelKey, registerPanelCommands]);
}
