import { createContext, useContext, useState, useCallback } from 'react';

export interface TabItem {
    id: string;
    [key: string]: any;
}

export interface TabDragInfo {
    start: number | undefined;
    over: number | undefined;
    enter: number | undefined;
    end: boolean;
}

interface TabsContextValue {
    selectedTab: string;
    setSelectedTab: (tab: TabItem) => void;
    tabDragInfo: TabDragInfo;
    setTabDragInfo: (info: TabDragInfo) => void;
    onTabSelect?: (tab: TabItem) => void;
    onTabClose?: (tab: TabItem, index: number) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs compound components must be used within Tabs.Root');
    }
    return context;
};

export interface UseTabsProps {
    selectedTab: string;
    onTabSelect?: (tab: TabItem) => void;
    onTabClose?: (tab: TabItem, index: number) => void;
}

export const useTabs = ({ selectedTab: initialSelectedTab, onTabSelect, onTabClose }: UseTabsProps) => {
    const [selectedTab, setSelectedTab] = useState(initialSelectedTab);
    const [tabDragInfo, setTabDragInfo] = useState<TabDragInfo>({
        start: undefined,
        over: undefined,
        enter: undefined,
        end: false,
    });

    // Sync internal state with external prop (synchronous, no render lag)
    if (selectedTab !== initialSelectedTab) {
        setSelectedTab(initialSelectedTab);
    }

    const handleTabSelect = useCallback(
        (tab: TabItem) => {
            setSelectedTab(tab.id);
            onTabSelect?.(tab);
        },
        [onTabSelect]
    );

    const handleTabClose = useCallback(
        (tab: TabItem, index: number) => {
            onTabClose?.(tab, index);
        },
        [onTabClose]
    );

    return {
        selectedTab,
        setSelectedTab: handleTabSelect,
        tabDragInfo,
        setTabDragInfo,
        onTabSelect,
        onTabClose: handleTabClose,
    };
};
