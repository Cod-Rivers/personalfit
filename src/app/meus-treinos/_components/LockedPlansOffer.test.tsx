import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let plans: unknown[] = [];
vi.mock('@/libs/planningService', () => ({
    getMyLockedPlans: () => Promise.resolve(plans),
}));

import LockedPlansOffer from './LockedPlansOffer';

describe('LockedPlansOffer', () => {
    beforeEach(() => {
        plans = [];
    });

    it('sem plano bloqueado: nada', async () => {
        const { container } = render(<LockedPlansOffer />);
        await Promise.resolve();
        expect(container.textContent).toBe('');
    });

    it('oferece manter o plano bloqueado, com prazo e preço', async () => {
        plans = [
            {
                id: 'p1',
                name: 'Hipertrofia',
                purge_at: '2027-01-02T12:00:00Z',
                value: 19.9,
            },
        ];
        render(<LockedPlansOffer />);

        expect(
            await screen.findByText(/Hipertrofia está bloqueado/),
        ).toBeTruthy();
        const cta = screen.getByText(/Manter este plano por/);
        expect(cta.textContent).toContain('19,90');
        expect(cta.getAttribute('href')).toBe(
            '/pagamento?produto=plano&planId=p1',
        );
    });
});
