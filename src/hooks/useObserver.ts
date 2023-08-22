import { useRef, useState } from 'react';

const useObserver = (aThreshold: number, aCallBack: () => void) => {
    const [sUseObserve, setUseObserve] = useState<boolean>(false);

    const observer = useRef(
        new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        aCallBack();
                    }
                });
            },
            { threshold: aThreshold }
        )
    );

    const observe = (element: HTMLElement | null) => {
        if (!sUseObserve && element) {
            observer.current.observe(element);
            setUseObserve(true);
        }
    };

    const unobserve = (element: HTMLElement | null) => {
        if (element) {
            observer.current.unobserve(element);
            setUseObserve(false);
        }
    };

    return [observe, unobserve];
};

export default useObserver;
