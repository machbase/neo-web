import { useEffect, useRef } from 'react';

export const useInfiniteScroll = (
    containerRef: React.RefObject<HTMLDivElement | null>,
    onLoadMore: (() => void) | undefined,
    hasMore: boolean
) => {
    const observeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!onLoadMore || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && hasMore) {
                        onLoadMore();
                    }
                });
            },
            {
                root: containerRef.current,
                rootMargin: '0px',
                threshold: 0.1,
            }
        );

        if (observeRef.current) {
            observer.observe(observeRef.current);
        }

        return () => {
            if (observeRef.current) {
                observer.unobserve(observeRef.current);
            }
        };
    }, [onLoadMore, hasMore]);

    return { observeRef };
};
