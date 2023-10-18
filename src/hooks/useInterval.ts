import { useEffect, useState } from 'react';

const useInterval = (callback: any, delay: any) => {
    const [savedCallback, setSavedCallback] = useState<any>(null); // useState사용

    // callback이 바뀔 때마다 실행
    // 첫 실행에 callback이 한 번 들어옴 -> 리렌더링 -> 다시 들어옴 -> 리렌더링 -> .. 무한 반복
    // 원래의 의도는 callback이 새로 들어오면 그 callback을 저장해두고 아래의 setInterval을 다시 실행해주려는 의도
    useEffect(() => {
        setSavedCallback(callback);
    }, [callback]);

    // mount가 끝나고 1번 일어남
    // 맨 처음 mount가 끝나고 savedCallback은 null이기 때문에 setInterval의 executeCallback이 제대로 실행되지 않음 (null이기 때문에)
    useEffect(() => {
        console.log(savedCallback());
        const executeCallback = () => {
            savedCallback();
        };

        const timerId = setInterval(executeCallback, delay);

        return () => clearInterval(timerId);
    }, []);
};

export default useInterval;
