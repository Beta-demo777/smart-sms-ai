import React from 'react';

interface SkeletonProps {
    className?: string;
}

/** Base animated shimmer block */
const Shimmer: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className}`} />
);

/** A stat card skeleton — matches the 4-card grid in Dashboard */
export const SkeletonCard: React.FC = () => (
    <div className="bg-zinc-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
            <Shimmer className="w-10 h-10 rounded-xl" />
            <Shimmer className="w-12 h-4 rounded" />
        </div>
        <Shimmer className="w-20 h-3 rounded mb-2" />
        <Shimmer className="w-16 h-7 rounded" />
    </div>
);

/** A table row skeleton */
export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <Shimmer className={`h-4 rounded ${i === 0 ? 'w-8' : i === 1 ? 'w-28' : 'w-16'}`} />
            </td>
        ))}
    </tr>
);

/** Generic inline text skeleton */
export const SkeletonText: React.FC<SkeletonProps> = ({ className = '' }) => (
    <Shimmer className={`h-4 rounded ${className}`} />
);
