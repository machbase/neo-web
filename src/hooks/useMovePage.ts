import { useNavigate } from 'react-router-dom';

export function useMovePage() {
    const sNavigate = useNavigate();

    const movePage = (sData: any) => {
        if (sData?.response?.status === 401) {
            sNavigate('/login');
        }
    };

    return { movePage };
}
