import { getLspMetadata, type LspLanguage } from '@/api/repository/lsp';
import type { LspMetadata } from '@/lsp/types';

const sMetadataCache = new Map<LspLanguage, LspMetadata>();
const sMetadataRequests = new Map<LspLanguage, Promise<LspMetadata | undefined>>();

export const getCachedLspMetadata = (language: LspLanguage) => sMetadataCache.get(language);

export const loadLspMetadata = async (language: LspLanguage, signal?: AbortSignal) => {
    const cached = sMetadataCache.get(language);
    if (cached) return cached;

    const inflight = sMetadataRequests.get(language);
    if (inflight) return inflight;

    const request = getLspMetadata(language, signal)
        .then((result: any) => {
            const metadata: LspMetadata | undefined = result?.data?.metadata;
            if (metadata) sMetadataCache.set(language, metadata);
            return metadata;
        })
        .finally(() => {
            sMetadataRequests.delete(language);
        });

    sMetadataRequests.set(language, request);
    return request;
};

export const clearLspMetadataCache = (language?: LspLanguage) => {
    if (language) {
        sMetadataCache.delete(language);
        sMetadataRequests.delete(language);
        return;
    }
    sMetadataCache.clear();
    sMetadataRequests.clear();
};
