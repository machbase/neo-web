import { useEffect, useState } from 'react';
import { getMediaServerConfig, type MediaServerConfigItem } from '@/api/repository/mediaSvr';
import { findVideoServer, getMediaServerBaseUrl } from '../utils/api';

export function useVideoServer(source?: { serverId?: string }) {
    const serverId = source?.serverId;
    const [lookup, setLookup] = useState<{ serverId: string; server?: MediaServerConfigItem }>();

    useEffect(() => {
        if (!serverId) return;
        let cancelled = false;
        getMediaServerConfig().then((servers) => {
            if (!cancelled) setLookup({ serverId, server: findVideoServer(serverId, servers) });
        });
        return () => { cancelled = true; };
    }, [serverId]);

    const server = lookup?.serverId === serverId ? lookup?.server : undefined;
    const loading = Boolean(serverId) && lookup?.serverId !== serverId;
    return { baseUrl: server ? getMediaServerBaseUrl(server) : undefined, server, loading };
}
