import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SkeletonCard, SkeletonRow, SkeletonText } from './Skeleton';

describe('Skeleton Components', () => {
    it('renders SkeletonCard correctly', () => {
        const { container } = render(<SkeletonCard />);
        expect(container.firstChild).toHaveClass('bg-zinc-50');
    });

    it('renders SkeletonRow with correct columns', () => {
        const { container } = render(
            <table>
                <tbody>
                    <SkeletonRow cols={3} />
                </tbody>
            </table>
        );
        const cells = container.querySelectorAll('td');
        expect(cells).toHaveLength(3);
    });

    it('renders SkeletonText correctly', () => {
        const { container } = render(<SkeletonText className="custom-test" />);
        expect(container.firstChild).toHaveClass('custom-test');
    });
});
