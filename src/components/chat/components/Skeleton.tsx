import './Skeleton.scss';
import { CSSProperties, ReactElement } from 'react';

export const SkeletonLabel = ({ pStyle }: { pStyle?: CSSProperties }) => {
    return (
        <div className="skeleton">
            <div className="skeleton-label" style={{ ...pStyle }} />
        </div>
    );
};

export const Skeleton = ({ pLength, pStyle }: { pLength: number; pStyle?: CSSProperties }) => {
    return (
        <SkeletonContainer>
            <>
                {Array.from({ length: pLength }).map((_, idx) => (
                    <div key={`skeleton-${idx}`} className="skeleton-item" style={{ ...pStyle }} />
                ))}
            </>
        </SkeletonContainer>
    );
};

export const SkeletonContainer = ({ children, pStyle }: { children: ReactElement[] | ReactElement; pStyle?: CSSProperties }) => {
    return (
        <div className="skeleton" style={{ ...pStyle }}>
            {children}
        </div>
    );
};
export const SkeletonItem = ({ pLength, pStyle }: { pLength: number; pStyle?: CSSProperties }) => {
    return (
        <>
            {Array.from({ length: pLength }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="skeleton-item" style={{ ...pStyle }} />
            ))}
        </>
    );
};
