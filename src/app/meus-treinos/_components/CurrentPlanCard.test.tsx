import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CurrentPlanCard from './CurrentPlanCard';
import { upgradeStorePlan } from '@/libs/storeService';
import type { MacrocycleResponse } from '@/libs/planningService';

vi.mock('@/components/features/DownloadOfflineButton', () => ({
    default: () => null,
}));
vi.mock('@/components/features/SyncPendingBadge', () => ({
    default: () => null,
}));
vi.mock('@/libs/storeService', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/libs/storeService')>()),
    upgradeStorePlan: vi.fn(),
}));

function plan(patch: Partial<MacrocycleResponse>): MacrocycleResponse {
    return {
        id: 'm1',
        name: 'Glúteos em 8 semanas',
        category: 'celebrity',
        status: 'active',
        mesocycles: [],
        ...patch,
    } as MacrocycleResponse;
}

describe('CurrentPlanCard, versão nova do programa (fase 3)', () => {
    it('oferece a versão nova e, confirmada, avisa a tela com o plano novo', async () => {
        const user = userEvent.setup();
        const fresh = plan({ id: 'm2' });
        vi.mocked(upgradeStorePlan).mockResolvedValue(fresh);
        const onStoreUpdated = vi.fn();
        const selected = plan({
            store_byline: {
                program_id: 'p1',
                author_name: 'Carla',
                venafit_collection: false,
                plan_version: 1,
                latest_version: 2,
                update_available: true,
            },
        });
        render(
            <CurrentPlanCard
                plans={[selected]}
                selected={selected}
                deletingId={null}
                onSelect={vi.fn()}
                onDelete={vi.fn()}
                onStoreUpdated={onStoreUpdated}
            />,
        );
        expect(
            screen.getByText('Versão nova deste programa'),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Usar a versão nova' }),
        );
        expect(screen.getByText(/Não há cobrança/)).toBeInTheDocument();
        const confirm = screen.getAllByRole('button', {
            name: 'Usar a versão nova',
        });
        await user.click(confirm[confirm.length - 1]);
        expect(upgradeStorePlan).toHaveBeenCalledWith('m1');
        expect(onStoreUpdated).toHaveBeenCalledWith(fresh);
    });

    it('sem versão nova, nada aparece', () => {
        const selected = plan({
            store_byline: {
                program_id: 'p1',
                venafit_collection: true,
                plan_version: 1,
                latest_version: 1,
                update_available: false,
            },
        });
        render(
            <CurrentPlanCard
                plans={[selected]}
                selected={selected}
                deletingId={null}
                onSelect={vi.fn()}
                onDelete={vi.fn()}
            />,
        );
        expect(
            screen.queryByText('Versão nova deste programa'),
        ).not.toBeInTheDocument();
    });
});
